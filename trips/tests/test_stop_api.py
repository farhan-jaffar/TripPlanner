import datetime

import pytest
from rest_framework import status

from trips.models import Stop
from trips.tests.factories import StopFactory, TripFactory


@pytest.mark.django_db
class TestStopAPI:
    def test_list_stops_for_trip(self, auth_client, sample_trip, user):
        StopFactory(trip=sample_trip, name="Stop A")
        StopFactory(
            trip=sample_trip,
            name="Stop B",
            arrival_date=sample_trip.start_date + datetime.timedelta(days=3),
            departure_date=sample_trip.start_date + datetime.timedelta(days=5),
        )

        other_trip = TripFactory(owner=user, title="Other Trip")
        StopFactory(trip=other_trip, name="Unrelated Stop")

        response = auth_client.get(f"/api/v1/trips/{sample_trip.id}/stops/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["count"] == 2
        names = [s["name"] for s in data["results"]]
        assert "Stop A" in names
        assert "Stop B" in names
        assert "Unrelated Stop" not in names

    def test_cross_trip_isolation_returns_404(self, auth_client, sample_trip, user):
        """
        Critical test: Proves that requesting a stop via another trip's URL path returns 404.
        """
        other_trip = TripFactory(owner=user, title="Other Trip")
        stop_on_other_trip = StopFactory(trip=other_trip, name="Other Stop")

        # Attempt to access stop_on_other_trip via sample_trip URL path
        url = f"/api/v1/trips/{sample_trip.id}/stops/{stop_on_other_trip.id}/"
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_stop_success(self, auth_client, sample_trip):
        payload = {
            "name": "Eiffel Tower",
            "description": "Famous landmark",
            "location": "Champ de Mars, Paris",
            "arrival_date": str(sample_trip.start_date),
            "departure_date": str(sample_trip.start_date + datetime.timedelta(days=2)),
        }
        response = auth_client.post(
            f"/api/v1/trips/{sample_trip.id}/stops/", payload, format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == "Eiffel Tower"
        assert data["trip"] == sample_trip.id
        assert Stop.objects.filter(pk=data["id"]).exists()

    def test_create_stop_auto_assigns_order(self, auth_client, sample_trip):
        StopFactory(trip=sample_trip, order=0)
        StopFactory(trip=sample_trip, order=1)

        payload = {
            "name": "Auto Ordered Stop",
            "location": "Downtown",
            "arrival_date": str(sample_trip.start_date),
            "departure_date": str(sample_trip.start_date + datetime.timedelta(days=1)),
        }
        response = auth_client.post(
            f"/api/v1/trips/{sample_trip.id}/stops/", payload, format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["order"] == 2

    def test_create_stop_arrival_before_trip_start_returns_400(self, auth_client, sample_trip):
        payload = {
            "name": "Too Early",
            "location": "City",
            "arrival_date": str(sample_trip.start_date - datetime.timedelta(days=1)),
            "departure_date": str(sample_trip.start_date + datetime.timedelta(days=2)),
        }
        response = auth_client.post(
            f"/api/v1/trips/{sample_trip.id}/stops/", payload, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "arrival_date" in response.json()

    def test_create_stop_departure_after_trip_end_returns_400(self, auth_client, sample_trip):
        payload = {
            "name": "Too Late",
            "location": "City",
            "arrival_date": str(sample_trip.start_date),
            "departure_date": str(sample_trip.end_date + datetime.timedelta(days=1)),
        }
        response = auth_client.post(
            f"/api/v1/trips/{sample_trip.id}/stops/", payload, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "departure_date" in response.json()

    def test_retrieve_stop_detail(self, auth_client, sample_trip):
        stop = StopFactory(trip=sample_trip, name="Meiji Shrine")
        response = auth_client.get(f"/api/v1/trips/{sample_trip.id}/stops/{stop.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["name"] == "Meiji Shrine"

    def test_update_stop_put(self, auth_client, sample_trip):
        stop = StopFactory(trip=sample_trip)
        payload = {
            "name": "Updated Stop",
            "description": "Updated desc",
            "location": "New location",
            "order": 10,
            "arrival_date": str(sample_trip.start_date),
            "departure_date": str(sample_trip.start_date + datetime.timedelta(days=3)),
        }
        response = auth_client.put(
            f"/api/v1/trips/{sample_trip.id}/stops/{stop.id}/",
            payload,
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        stop.refresh_from_db()
        assert stop.name == "Updated Stop"
        assert stop.order == 10

    def test_partial_update_stop_patch(self, auth_client, sample_trip):
        stop = StopFactory(trip=sample_trip)
        payload = {"name": "Patched Stop"}
        response = auth_client.patch(
            f"/api/v1/trips/{sample_trip.id}/stops/{stop.id}/",
            payload,
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        stop.refresh_from_db()
        assert stop.name == "Patched Stop"

    def test_delete_stop(self, auth_client, sample_trip):
        stop = StopFactory(trip=sample_trip)
        response = auth_client.delete(f"/api/v1/trips/{sample_trip.id}/stops/{stop.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Stop.objects.filter(pk=stop.id).exists()

    def test_search_stops(self, auth_client, sample_trip):
        StopFactory(trip=sample_trip, name="Akihabara Station", location="Tokyo")
        StopFactory(trip=sample_trip, name="Ueno Park", location="Tokyo")

        response = auth_client.get(f"/api/v1/trips/{sample_trip.id}/stops/?search=Akihabara")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["count"] == 1
