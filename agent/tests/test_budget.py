import pytest
from django.core.cache import cache
from rest_framework import status

from agent.budget import (
    acquire_concurrency_lock,
    check_and_record_gemini_rpm,
    check_preflight_budget,
    generation_cost,
    get_provider_daily_count,
    get_user_daily_count,
    record_outbound_call,
    record_user_generation,
    release_concurrency_lock,
)


class TestGenerationCost:
    def test_zero_cities_clamped_to_1(self):
        assert generation_cost(0) == 1

    def test_single_city_costs_1(self):
        assert generation_cost(1) == 1

    def test_three_cities_costs_3(self):
        assert generation_cost(3) == 3

    def test_five_cities_clamped_to_4(self):
        assert generation_cost(5) == 4

    def test_four_cities_costs_4(self):
        assert generation_cost(4) == 4


@pytest.mark.django_db
def test_user_daily_credit_limit_blocks_generation(user, settings):
    settings.USER_DAILY_CREDIT_LIMIT = 6

    # Initial state
    allowed, _ = check_preflight_budget(user)
    assert allowed is True

    # Record 6 credits (e.g. two 3-city trips)
    record_user_generation(user, cost=3)
    record_user_generation(user, cost=3)
    assert get_user_daily_count(user) == 6

    # Next attempt must be blocked
    allowed, reason = check_preflight_budget(user)
    assert allowed is False
    assert "daily AI credits" in reason


@pytest.mark.django_db
def test_multi_city_deducts_correct_credits(user, settings):
    settings.USER_DAILY_CREDIT_LIMIT = 10

    # 3-city trip costs 3 credits
    cost = generation_cost(3)
    assert cost == 3
    record_user_generation(user, cost=cost)
    assert get_user_daily_count(user) == 3

    # Another 2-city trip costs 2 credits
    cost2 = generation_cost(2)
    assert cost2 == 2
    record_user_generation(user, cost=cost2)
    assert get_user_daily_count(user) == 5


@pytest.mark.django_db
def test_global_provider_daily_limit_blocks_generation(user, settings):
    settings.GEOAPIFY_DAILY_LIMIT = 5

    # Increment Geoapify outbound calls to limit
    record_outbound_call("geoapify", 5)
    assert get_provider_daily_count("geoapify") == 5

    allowed, reason = check_preflight_budget(user)
    assert allowed is False
    assert "daily capacity" in reason


@pytest.mark.django_db
def test_geonames_daily_limit_blocks_generation(user, settings):
    settings.GEONAMES_DAILY_LIMIT = 100

    record_outbound_call("geonames", 100)
    assert get_provider_daily_count("geonames") == 100

    allowed, reason = check_preflight_budget(user)
    assert allowed is False
    assert "City discovery" in reason


@pytest.mark.django_db
def test_outbound_call_increments_provider_usage():
    assert get_provider_daily_count("gemini") == 0
    record_outbound_call("gemini", 1)
    assert get_provider_daily_count("gemini") == 1
    record_outbound_call("gemini", 3)
    assert get_provider_daily_count("gemini") == 4


def test_concurrency_lock_semaphore():
    # Clear any previous concurrency state
    cache.delete("budget:concurrency:active_count")

    # Max concurrent is 2
    assert acquire_concurrency_lock() is True
    assert acquire_concurrency_lock() is True
    # 3rd attempt exceeds semaphore
    assert acquire_concurrency_lock() is False

    # Release one slot
    release_concurrency_lock()
    # Now one slot should be free
    assert acquire_concurrency_lock() is True

    # Cleanup
    release_concurrency_lock()
    release_concurrency_lock()


def test_gemini_rpm_sliding_window():
    # Clean cache
    cache.clear()

    # Up to 10 RPM allowed
    for _ in range(10):
        assert check_and_record_gemini_rpm() is True

    # 11th in the same minute throttles
    assert check_and_record_gemini_rpm() is False


@pytest.mark.django_db
def test_view_returns_429_when_user_budget_exhausted(auth_client, user, settings):
    settings.USER_DAILY_CREDIT_LIMIT = 1
    record_user_generation(user, cost=1)

    payload = {
        "country": "FR",
        "city": "Paris",
        "start_date": "2026-10-01",
        "end_date": "2026-10-03",
        "interests": ["museums"],
    }
    resp = auth_client.post("/api/v1/itinerary/generate/", payload, format="json")
    assert resp.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert "daily AI credits" in resp.data["detail"]
