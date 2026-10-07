from unittest.mock import patch

import pytest
from rest_framework import status

from agent.grounding import GroundingError
from trips.models import Stop, Trip


@pytest.mark.django_db
class TestItineraryGenerateView:
    url = "/api/v1/itinerary/generate/"

    def test_unauthenticated_user_denied(self, client):
        resp = client.post(self.url, {})
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_invalid_country_code_rejected(self, auth_client):
        payload = {
            "country": "ZZ",  # Invalid ISO code
            "city": "Paris",
            "start_date": "2026-10-01",
            "end_date": "2026-10-03",
            "interests": ["museums"],
        }
        resp = auth_client.post(self.url, payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "country" in resp.data

    def test_duration_over_14_days_rejected(self, auth_client):
        payload = {
            "country": "FR",
            "city": "Paris",
            "start_date": "2026-10-01",
            "end_date": "2026-10-20",  # 20 days > 14
            "interests": ["museums"],
        }
        resp = auth_client.post(self.url, payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "end_date" in resp.data

    def test_end_date_before_start_date_rejected(self, auth_client):
        payload = {
            "country": "FR",
            "city": "Paris",
            "start_date": "2026-10-05",
            "end_date": "2026-10-01",
            "interests": ["museums"],
        }
        resp = auth_client.post(self.url, payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "end_date" in resp.data

    @patch("agent.views.generate_itinerary")
    def test_generate_itinerary_success_and_caching(
        self, mock_generate, auth_client, sample_itinerary
    ):
        mock_generate.return_value = sample_itinerary

        payload = {
            "country": "FR",
            "city": "Paris",
            "start_date": "2026-10-01",
            "end_date": "2026-10-02",
            "interests": ["museums", "food"],
            "pace": "moderate",
        }

        # First request: fresh generation
        resp1 = auth_client.post(self.url, payload, format="json")
        assert resp1.status_code == status.HTTP_200_OK
        assert resp1.data["cached"] is False
        assert resp1.data["itinerary"]["trip_title"] == "Art & Flavors of Paris"
        assert len(resp1.data["itinerary"]["days"]) == 2
        assert "weather" in resp1.data["attribution"]
        assert mock_generate.call_count == 1

        # Second request: identical payload should be served from cache without invoking Gemini
        resp2 = auth_client.post(self.url, payload, format="json")
        assert resp2.status_code == status.HTTP_200_OK
        assert resp2.data["cached"] is True
        assert resp2.data["itinerary"]["trip_title"] == "Art & Flavors of Paris"
        assert mock_generate.call_count == 1  # Not called again!

    @patch("agent.views.generate_itinerary")
    def test_country_level_request_passes_is_country_level(
        self, mock_generate, auth_client, sample_itinerary
    ):
        mock_generate.return_value = sample_itinerary

        payload = {
            "country": "FR",
            "city": "",
            "start_date": "2026-10-01",
            "end_date": "2026-10-02",
            "interests": ["museums"],
        }
        resp = auth_client.post(self.url, payload, format="json")
        assert resp.status_code == status.HTTP_200_OK
        # Verify is_country_level was passed to generate_itinerary
        call_kwargs = mock_generate.call_args[1]
        assert call_kwargs["is_country_level"] is True

    @patch("agent.views.generate_itinerary")
    def test_grounding_error_returns_422(self, mock_generate, auth_client):
        mock_generate.side_effect = GroundingError("Could not verify enough genuine attractions.")

        payload = {
            "country": "FR",
            "city": "Unknown Tiny Village",
            "start_date": "2026-10-01",
            "end_date": "2026-10-03",
            "interests": ["shopping"],
        }
        resp = auth_client.post(self.url, payload, format="json")
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "detail" in resp.data


@pytest.mark.django_db
class TestItineraryAcceptView:
    url = "/api/v1/itinerary/accept/"

    def test_unauthenticated_user_denied(self, client):
        resp = client.post(self.url, {})
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_atomic_accept_success(self, auth_client, user):
        payload = {
            "trip": {
                "title": "Autumn in Paris",
                "description": "AI-generated trip",
                "start_date": "2026-10-01",
                "end_date": "2026-10-03",
            },
            "stops": [
                {
                    "name": "Louvre Museum",
                    "description": "09:30 - Pre-booked tickets",
                    "location": "Paris, France",
                    "order": 0,
                    "arrival_date": "2026-10-01",
                    "departure_date": "2026-10-01",
                },
                {
                    "name": "Eiffel Tower",
                    "description": "15:00 - Sunset view",
                    "location": "Paris, France",
                    "order": 1,
                    "arrival_date": "2026-10-02",
                    "departure_date": "2026-10-02",
                },
            ],
        }

        resp = auth_client.post(self.url, payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["stops_count"] == 2
        assert resp.data["trip"]["title"] == "Autumn in Paris"

        # Verify DB records
        created_trip = Trip.objects.get(id=resp.data["trip"]["id"])
        assert created_trip.owner == user
        assert created_trip.stops.count() == 2

    def test_atomic_accept_with_transfer_stop(self, auth_client, user):
        """Transfer stops should be persisted with stop_type and duration_minutes."""
        payload = {
            "trip": {
                "title": "Paris to Lyon",
                "description": "Multi-city trip",
                "start_date": "2026-10-01",
                "end_date": "2026-10-03",
            },
            "stops": [
                {
                    "name": "Louvre Museum",
                    "description": "Visit",
                    "location": "Paris, France",
                    "order": 0,
                    "arrival_date": "2026-10-01",
                    "departure_date": "2026-10-01",
                    "stop_type": "visit",
                },
                {
                    "name": "Paris \u2192 Lyon",
                    "description": "Transfer",
                    "location": "",
                    "order": 1,
                    "arrival_date": "2026-10-02",
                    "departure_date": "2026-10-02",
                    "stop_type": "transfer",
                    "duration_minutes": 120,
                },
            ],
        }
        resp = auth_client.post(self.url, payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["stops_count"] == 2

        transfer_stop = Stop.objects.get(name="Paris \u2192 Lyon")
        assert transfer_stop.stop_type == "transfer"
        assert transfer_stop.duration_minutes == 120

    def test_atomic_rollback_on_invalid_stop_date(self, auth_client):
        """If any stop violates date bounds, the entire transaction must roll back."""
        payload = {
            "trip": {
                "title": "Weekend in Lyon",
                "description": "Trip with invalid stop date",
                "start_date": "2026-10-01",
                "end_date": "2026-10-03",
            },
            "stops": [
                {
                    "name": "Valid Stop",
                    "description": "Day 1",
                    "arrival_date": "2026-10-01",
                    "departure_date": "2026-10-01",
                },
                {
                    "name": "Out of Bounds Stop",
                    "description": "Day 10 (Violates trip end date!)",
                    "arrival_date": "2026-10-10",  # Outside 2026-10-01 to 2026-10-03!
                    "departure_date": "2026-10-10",
                },
            ],
        }

        resp = auth_client.post(self.url, payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

        # Verify 0 trips and 0 stops remain in DB
        assert Trip.objects.filter(title="Weekend in Lyon").count() == 0
        assert Stop.objects.filter(name="Valid Stop").count() == 0
