import pytest
from rest_framework import status

from trips.tests.factories import TripFactory


@pytest.mark.django_db
class TestPermissions:
    def test_unauthenticated_requests_return_401(self, api_client, sample_trip, sample_stop):
        assert api_client.get("/api/v1/trips/").status_code == status.HTTP_401_UNAUTHORIZED
        assert (
            api_client.post("/api/v1/trips/", {"title": "X"}, format="json").status_code
            == status.HTTP_401_UNAUTHORIZED
        )
        assert (
            api_client.get(f"/api/v1/trips/{sample_trip.id}/").status_code
            == status.HTTP_401_UNAUTHORIZED
        )
        assert (
            api_client.patch(
                f"/api/v1/trips/{sample_trip.id}/", {"title": "X"}, format="json"
            ).status_code
            == status.HTTP_401_UNAUTHORIZED
        )
        assert (
            api_client.delete(f"/api/v1/trips/{sample_trip.id}/").status_code
            == status.HTTP_401_UNAUTHORIZED
        )
        assert (
            api_client.get(f"/api/v1/trips/{sample_trip.id}/stops/").status_code
            == status.HTTP_401_UNAUTHORIZED
        )
        assert (
            api_client.get(f"/api/v1/trips/{sample_trip.id}/stops/{sample_stop.id}/").status_code
            == status.HTTP_401_UNAUTHORIZED
        )

    def test_user_cannot_view_or_list_other_users_trips(
        self, auth_client, other_auth_client, user, other_user
    ):
        TripFactory(owner=user, title="User A Trip")
        TripFactory(owner=other_user, title="User B Trip")

        # User A's list only contains User A's trips
        response_a = auth_client.get("/api/v1/trips/")
        assert response_a.status_code == status.HTTP_200_OK
        data_a = response_a.json()
        assert data_a["count"] == 1
        assert data_a["results"][0]["title"] == "User A Trip"

        # User B's list only contains User B's trips
        response_b = other_auth_client.get("/api/v1/trips/")
        assert response_b.status_code == status.HTTP_200_OK
        data_b = response_b.json()
        assert data_b["count"] == 1
        assert data_b["results"][0]["title"] == "User B Trip"

    def test_user_cannot_access_other_users_trip_detail(
        self, other_auth_client, sample_trip
    ):
        # User B attempts to access User A's trip -> returns 404 (not 403)
        # to prevent existence leakage
        response = other_auth_client.get(f"/api/v1/trips/{sample_trip.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


    def test_user_cannot_edit_other_users_trip(self, other_auth_client, sample_trip):
        response = other_auth_client.patch(
            f"/api/v1/trips/{sample_trip.id}/",
            {"title": "Hacked Title"},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        sample_trip.refresh_from_db()
        assert sample_trip.title != "Hacked Title"

    def test_user_cannot_delete_other_users_trip(self, other_auth_client, sample_trip):
        response = other_auth_client.delete(f"/api/v1/trips/{sample_trip.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_user_cannot_list_or_create_stops_on_other_users_trip(
        self, other_auth_client, sample_trip
    ):
        # Stops list on someone else's trip returns 404
        response_list = other_auth_client.get(f"/api/v1/trips/{sample_trip.id}/stops/")
        assert response_list.status_code == status.HTTP_404_NOT_FOUND

        # Stop create on someone else's trip returns 404
        payload = {
            "name": "Unauthorized Stop",
            "location": "Forbidden City",
            "arrival_date": str(sample_trip.start_date),
            "departure_date": str(sample_trip.start_date),
        }
        response_create = other_auth_client.post(
            f"/api/v1/trips/{sample_trip.id}/stops/",
            payload,
            format="json",
        )
        assert response_create.status_code == status.HTTP_404_NOT_FOUND

    def test_user_cannot_retrieve_edit_or_delete_stops_on_other_users_trip(
        self, other_auth_client, sample_trip, sample_stop
    ):
        # Retrieve stop on other user's trip
        response_get = other_auth_client.get(
            f"/api/v1/trips/{sample_trip.id}/stops/{sample_stop.id}/"
        )
        assert response_get.status_code == status.HTTP_404_NOT_FOUND

        # Edit stop on other user's trip
        response_patch = other_auth_client.patch(
            f"/api/v1/trips/{sample_trip.id}/stops/{sample_stop.id}/",
            {"name": "Hacked Stop"},
            format="json",
        )
        assert response_patch.status_code == status.HTTP_404_NOT_FOUND

        # Delete stop on other user's trip
        response_delete = other_auth_client.delete(
            f"/api/v1/trips/{sample_trip.id}/stops/{sample_stop.id}/"
        )
        assert response_delete.status_code == status.HTTP_404_NOT_FOUND
