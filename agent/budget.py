import time
from datetime import UTC, datetime

from django.conf import settings
from django.core.cache import cache

# Budget limits
DEFAULT_GEMINI_DAILY_LIMIT = getattr(settings, "GEMINI_DAILY_LIMIT", 1000)
DEFAULT_GEOAPIFY_DAILY_LIMIT = getattr(settings, "GEOAPIFY_DAILY_LIMIT", 2500)
DEFAULT_OPENMETEO_DAILY_LIMIT = getattr(settings, "OPENMETEO_DAILY_LIMIT", 8000)
DEFAULT_GEONAMES_DAILY_LIMIT = getattr(settings, "GEONAMES_DAILY_LIMIT", 20000)
DEFAULT_USER_DAILY_CREDIT_LIMIT = getattr(settings, "USER_DAILY_CREDIT_LIMIT", 6)

MAX_CONCURRENT_GENERATIONS = 2
GEMINI_RPM_LIMIT = 10
GEOAPIFY_RPS_LIMIT = 4

CONCURRENCY_KEY = "budget:concurrency:active_count"


def _today_str() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%d")


def _user_budget_key(user_id: int | str, date_str: str | None = None) -> str:
    d = date_str or _today_str()
    return f"budget:user:{user_id}:{d}"


def _provider_budget_key(provider: str, date_str: str | None = None) -> str:
    d = date_str or _today_str()
    return f"budget:global:{provider}:{d}"


def get_user_daily_count(user) -> int:
    key = _user_budget_key(user.pk)
    return cache.get(key, 0)


def get_provider_daily_count(provider: str) -> int:
    key = _provider_budget_key(provider)
    return cache.get(key, 0)


def generation_cost(cities_selected: int) -> int:
    """
    Returns the credit cost for a generation based on city count.
    Clamped between 1 and 4 credits.
    """
    return max(1, min(cities_selected, 4))


def check_preflight_budget(user) -> tuple[bool, str]:
    """
    Evaluates whether the request is allowed to proceed before consuming any provider quota.
    Checks per-user daily credit pool and global provider safety caps.
    """
    user_limit = getattr(settings, "USER_DAILY_CREDIT_LIMIT", DEFAULT_USER_DAILY_CREDIT_LIMIT)
    user_count = get_user_daily_count(user)
    if user_count >= user_limit:
        msg = f"You've used all {user_limit} daily AI credits. Try again tomorrow."
        return False, msg

    gemini_limit = getattr(settings, "GEMINI_DAILY_LIMIT", DEFAULT_GEMINI_DAILY_LIMIT)
    gemini_count = get_provider_daily_count("gemini")
    if gemini_count >= gemini_limit:
        return False, "Itinerary generation is at daily project capacity. Please retry tomorrow."

    geoapify_limit = getattr(settings, "GEOAPIFY_DAILY_LIMIT", DEFAULT_GEOAPIFY_DAILY_LIMIT)
    geoapify_count = get_provider_daily_count("geoapify")
    if geoapify_count >= geoapify_limit:
        return False, "Attraction lookup is at daily capacity. Please check back tomorrow."

    openmeteo_limit = getattr(settings, "OPENMETEO_DAILY_LIMIT", DEFAULT_OPENMETEO_DAILY_LIMIT)
    openmeteo_count = get_provider_daily_count("openmeteo")
    if openmeteo_count >= openmeteo_limit:
        return False, "Weather service is currently at daily capacity. Please retry tomorrow."

    geonames_limit = getattr(settings, "GEONAMES_DAILY_LIMIT", DEFAULT_GEONAMES_DAILY_LIMIT)
    geonames_count = get_provider_daily_count("geonames")
    if geonames_count >= geonames_limit:
        return False, "City discovery service is at daily capacity. Please retry tomorrow."

    return True, ""


def acquire_concurrency_lock() -> bool:
    """
    Atomic concurrency semaphore using cache.
    Allows at most MAX_CONCURRENT_GENERATIONS active generation jobs project-wide.
    """
    try:
        # cache.add sets only if key doesn't exist
        cache.add(CONCURRENCY_KEY, 0, timeout=300)
        current = cache.incr(CONCURRENCY_KEY)
        if current > MAX_CONCURRENT_GENERATIONS:
            cache.decr(CONCURRENCY_KEY)
            return False
        return True
    except Exception:
        # Fallback gracefully if cache backend has issues with incr
        return True


def release_concurrency_lock() -> None:
    """Releases an active generation slot from the concurrency semaphore."""
    try:
        current = cache.get(CONCURRENCY_KEY, 0)
        if current > 0:
            cache.decr(CONCURRENCY_KEY)
    except Exception:
        pass


def check_and_record_gemini_rpm() -> bool:
    """
    Sliding window RPM check for Gemini (default max 10 RPM).
    Returns True if allowed and records call, False if throttled.
    """
    minute_bucket = int(time.time() // 60)
    key = f"budget:gemini:rpm:{minute_bucket}"
    cache.add(key, 0, timeout=70)
    current = cache.incr(key)
    return current <= GEMINI_RPM_LIMIT


def check_and_record_geoapify_rps() -> bool:
    """
    RPS check for Geoapify (max 4 requests per second).
    Returns True if allowed and records call, False if throttled.
    """
    second_bucket = int(time.time())
    key = f"budget:geoapify:rps:{second_bucket}"
    cache.add(key, 0, timeout=3)
    current = cache.incr(key)
    return current <= GEOAPIFY_RPS_LIMIT


def record_outbound_call(provider: str, cost: int = 1) -> None:
    """
    Increments provider daily usage immediately following a real outbound HTTP call.
    Key expires at midnight UTC (86400s).
    """
    key = _provider_budget_key(provider)
    cache.add(key, 0, timeout=86400)
    cache.incr(key, delta=cost)


def record_user_generation(user, cost: int = 1) -> None:
    """
    Increments the authenticated user's daily credit consumption.
    Cost scales with city count (1 credit per city, clamped 1–4).
    """
    key = _user_budget_key(user.pk)
    cache.add(key, 0, timeout=86400)
    cache.incr(key, delta=cost)
