import hashlib
import json
from typing import Any

from django.core.cache import cache

PLACES_CACHE_TTL = 86400  # 24 hours
WEATHER_CACHE_TTL = 14400  # 4 hours
ROUTE_CACHE_TTL = 86400  # 24 hours
ITINERARY_CACHE_TTL = 3600  # 1 hour
CITY_CANDIDATES_CACHE_TTL = 60 * 60 * 24 * 30  # 30 days


def _places_key(country: str, city: str, category: str) -> str:
    norm_city = city.strip().lower().replace(" ", "_")
    norm_cat = category.strip().lower()
    return f"geoapify:places:{country.upper()}:{norm_city}:{norm_cat}"


def get_cached_places(country: str, city: str, category: str) -> list[dict] | None:
    return cache.get(_places_key(country, city, category))


def set_cached_places(
    country: str, city: str, category: str, places: list[dict], timeout: int = PLACES_CACHE_TTL
) -> None:
    cache.set(_places_key(country, city, category), places, timeout=timeout)


def _weather_key(lat: float, lon: float, start_date: str, end_date: str) -> str:
    # Round coordinates to 2 decimal places (~1.1 km resolution) to maximize cache hits
    return f"openmeteo:weather:{lat:.2f}:{lon:.2f}:{start_date}:{end_date}"


def get_cached_weather(lat: float, lon: float, start_date: str, end_date: str) -> dict | None:
    return cache.get(_weather_key(lat, lon, start_date, end_date))


def set_cached_weather(
    lat: float,
    lon: float,
    start_date: str,
    end_date: str,
    data: dict,
    timeout: int = WEATHER_CACHE_TTL,
) -> None:
    cache.set(_weather_key(lat, lon, start_date, end_date), data, timeout=timeout)


def _route_key(waypoints_str: str, mode: str) -> str:
    h = hashlib.md5(f"{waypoints_str}:{mode}".encode()).hexdigest()
    return f"geoapify:route:{h}"


def get_cached_route(waypoints_str: str, mode: str) -> dict | None:
    return cache.get(_route_key(waypoints_str, mode))


def set_cached_route(
    waypoints_str: str, mode: str, data: dict, timeout: int = ROUTE_CACHE_TTL
) -> None:
    cache.set(_route_key(waypoints_str, mode), data, timeout=timeout)


def compute_itinerary_signature(
    country: str, city: str, start_date: str, end_date: str, interests: list[str], pace: str
) -> str:
    """Generates a deterministic signature hash for identical itinerary generation requests."""
    payload = {
        "country": country.upper(),
        "city": city.strip().lower(),
        "start_date": str(start_date),
        "end_date": str(end_date),
        "interests": sorted(interests),
        "pace": pace.lower(),
    }
    dumped = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(dumped.encode()).hexdigest()


def get_cached_itinerary(signature: str) -> dict[str, Any] | None:
    return cache.get(f"itinerary:signature:{signature}")


def set_cached_itinerary(
    signature: str, itinerary_data: dict[str, Any], timeout: int = ITINERARY_CACHE_TTL
) -> None:
    cache.set(f"itinerary:signature:{signature}", itinerary_data, timeout=timeout)


def _city_candidates_key(country_code: str) -> str:
    return f"geonames:cities:{country_code.upper()}"


def get_city_candidates(country_code: str) -> list[dict] | None:
    return cache.get(_city_candidates_key(country_code))


def set_city_candidates(
    country_code: str,
    candidates: list[dict],
    timeout: int = CITY_CANDIDATES_CACHE_TTL,
) -> None:
    cache.set(_city_candidates_key(country_code), candidates, timeout=timeout)
