import datetime

import pytest
from rest_framework import status

from trips.models import Stop, Trip
from trips.tests.factories import StopFactory, TripFactory


@pytest.mark.django_db
class TestTripAPI:
    def test_list_trips_paginated(self, auth_client, user):
        TripFactory.create_batch(3, owner=user)
        response = auth_client.get("/api/v1/trips/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "count" in data
        assert "results" in data
        assert data["count"] == 3
        assert len(data["results"]) == 3

    def test_list_trips_stop_count_annotation(self, auth_client, user):
        trip = TripFactory(owner=user, title="Trip with Stops")
        StopFactory(trip=trip, name="Stop 1")
        StopFactory(
            trip=trip,
            name="Stop 2",
            arrival_date=trip.start_date + datetime.timedelta(days=3),
            departure_date=trip.start_date + datetime.timedelta(days=5),
        )

        response = auth_client.get("/api/v1/trips/")
        assert response.status_code == status.HTTP_200_OK
        results = response.json()["results"]
        matched = next(r for r in results if r["id"] == trip.id)
        assert matched["stop_count"] == 2

    def test_create_trip_success(self, auth_client, user):
        payload = {
            "title": "Summer Escapade",
            "description": "Exploring coastal towns.",
            "start_date": "2026-09-01",
            "end_date": "2026-09-15",
        }
        response = auth_client.post("/api/v1/trips/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["title"] == "Summer Escapade"
        assert data["owner"] == user.id
        assert data["owner_username"] == user.username
        assert Trip.objects.filter(pk=data["id"], owner=user).exists()

    def test_create_trip_invalid_dates_returns_400(self, auth_client):
        payload = {
            "title": "Invalid Trip",
            "start_date": "2026-09-15",
            "end_date": "2026-09-01",
        }
        response = auth_client.post("/api/v1/trips/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "end_date" in response.json()

    def test_retrieve_trip_detail(self, auth_client, sample_trip):
        response = auth_client.get(f"/api/v1/trips/{sample_trip.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == sample_trip.id

    def test_retrieve_nonexistent_trip_returns_404(self, auth_client):
        response = auth_client.get("/api/v1/trips/999999/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_trip_put(self, auth_client, sample_trip):
        payload = {
            "title": "Updated Title",
            "description": "Updated Description",
            "start_date": "2026-08-01",
            "end_date": "2026-08-10",
        }
        response = auth_client.put(f"/api/v1/trips/{sample_trip.id}/", payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        sample_trip.refresh_from_db()
        assert sample_trip.title == "Updated Title"

    def test_partial_update_trip_patch(self, auth_client, sample_trip):
        payload = {"title": "Patched Title"}
        response = auth_client.patch(f"/api/v1/trips/{sample_trip.id}/", payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        sample_trip.refresh_from_db()
        assert sample_trip.title == "Patched Title"

    def test_delete_trip_cascades_stops(self, auth_client, sample_trip):
        stop = StopFactory(trip=sample_trip)
        stop_id = stop.id

        response = auth_client.delete(f"/api/v1/trips/{sample_trip.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Trip.objects.filter(pk=sample_trip.id).exists()
        assert not Stop.objects.filter(pk=stop_id).exists()

    def test_filter_trips_by_date_range(self, auth_client, user):
        TripFactory(
            owner=user,
            title="Early Trip",
            start_date=datetime.date(2026, 1, 10),
            end_date=datetime.date(2026, 1, 20),
        )
        TripFactory(
            owner=user,
            title="Late Trip",
            start_date=datetime.date(2026, 11, 1),
            end_date=datetime.date(2026, 11, 15),
        )

        response = auth_client.get("/api/v1/trips/?start_date_after=2026-06-01")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["count"] == 1
        assert data["results"][0]["title"] == "Late Trip"

    def test_search_trips(self, auth_client, user):
        TripFactory(owner=user, title="Skiing in Hokkaido", description="Snow resort")
        TripFactory(owner=user, title="Beach resort", description="Tropical island")

        response = auth_client.get("/api/v1/trips/?search=Hokkaido")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["count"] == 1

    def test_ordering_trips(self, auth_client, user):
        t1 = TripFactory(
            owner=user,
            title="A Trip",
            start_date=datetime.date(2026, 8, 1),
            end_date=datetime.date(2026, 8, 5),
        )
        t2 = TripFactory(
            owner=user,
            title="B Trip",
            start_date=datetime.date(2026, 5, 1),
            end_date=datetime.date(2026, 5, 5),
        )

        response = auth_client.get("/api/v1/trips/?ordering=start_date")
        assert response.status_code == status.HTTP_200_OK
        results = response.json()["results"]
        assert results[0]["id"] == t2.id
        assert results[1]["id"] == t1.id

    def test_pagination_controls_and_max_page_size(self, auth_client, user):
        TripFactory.create_batch(5, owner=user)
        response = auth_client.get("/api/v1/trips/?page_size=2")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["count"] == 5
        assert len(data["results"]) == 2

        # Capped at max_page_size (100)
        response_large = auth_client.get("/api/v1/trips/?page_size=500")
        assert response_large.status_code == status.HTTP_200_OK
        assert len(response_large.json()["results"]) == 5

