import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient

from agent.schemas import GeneratedItinerary, ItineraryDay, ItineraryStop

User = get_user_model()


@pytest.fixture(autouse=True)
def clear_cache_before_and_after():
    """Ensure a pristine cache state for every test."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="traveler",
        email="traveler@example.com",
        password="password123",
    )


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def mock_places_list():
    return [
        {
            "geoapify_place_id": "geo_louvre_123",
            "name": "Louvre Museum",
            "latitude": 48.8606,
            "longitude": 2.3376,
            "category": "museums",
            "address": "Rue de Rivoli, 75001 Paris, France",
        },
        {
            "geoapify_place_id": "geo_orsay_456",
            "name": "Musée d'Orsay",
            "latitude": 48.8600,
            "longitude": 2.3266,
            "category": "museums",
            "address": "1 Rue de la Légion d'Honneur, 75007 Paris, France",
        },
        {
            "geoapify_place_id": "geo_bistro_789",
            "name": "Le Comptoir du Relais",
            "latitude": 48.8519,
            "longitude": 2.3387,
            "category": "food",
            "address": "9 Carrefour de l'Odéon, 75006 Paris, France",
        },
        {
            "geoapify_place_id": "geo_tuileries_101",
            "name": "Tuileries Garden",
            "latitude": 48.8634,
            "longitude": 2.3275,
            "category": "walking",
            "address": "Place de la Concorde, 75001 Paris, France",
        },
    ]


@pytest.fixture
def sample_itinerary():
    return GeneratedItinerary(
        trip_title="Art & Flavors of Paris",
        cities=["Paris"],
        days=[
            ItineraryDay(
                date="2026-10-01",
                city="Paris",
                weather_summary="Partly cloudy, 14°C to 20°C",
                route_summary="Total walking: ~30 mins (2.1 km)",
                stops=[
                    ItineraryStop(
                        name="Louvre Museum",
                        geoapify_place_id="geo_louvre_123",
                        latitude=48.8606,
                        longitude=2.3376,
                        category="museums",
                        suggested_time="09:30",
                        note="Book time slot in advance.",
                        travel_from_previous=None,
                    ),
                    ItineraryStop(
                        name="Tuileries Garden",
                        geoapify_place_id="geo_tuileries_101",
                        latitude=48.8634,
                        longitude=2.3275,
                        category="walking",
                        suggested_time="12:30",
                        note="Stroll and relax after the museum.",
                        travel_from_previous="10 min walk (0.8 km)",
                    ),
                ],
            ),
            ItineraryDay(
                date="2026-10-02",
                city="Paris",
                weather_summary="Clear sky, 15°C to 22°C",
                route_summary="Total walking: ~20 mins (1.4 km)",
                stops=[
                    ItineraryStop(
                        name="Musée d'Orsay",
                        geoapify_place_id="geo_orsay_456",
                        latitude=48.8600,
                        longitude=2.3266,
                        category="museums",
                        suggested_time="10:00",
                        note="World-class Impressionist collection.",
                        travel_from_previous=None,
                    ),
                    ItineraryStop(
                        name="Le Comptoir du Relais",
                        geoapify_place_id="geo_bistro_789",
                        latitude=48.8519,
                        longitude=2.3387,
                        category="food",
                        suggested_time="13:00",
                        note="Classic Parisian bistro lunch.",
                        travel_from_previous="15 min walk (1.1 km)",
                    ),
                ],
            ),
        ],
    )
