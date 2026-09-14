import datetime

import pytest

from trips.serializers import StopSerializer, TripSerializer
from trips.tests.factories import StopFactory, TripFactory


@pytest.mark.django_db
class TestTripSerializer:
    def test_valid_trip_serializer(self):
        payload = {
            "title": "Japan Journey",
            "description": "Visiting Tokyo and Kyoto.",
            "start_date": "2026-09-01",
            "end_date": "2026-09-15",
        }
        serializer = TripSerializer(data=payload)
        assert serializer.is_valid(), serializer.errors
        trip = serializer.save()
        assert trip.title == "Japan Journey"

    def test_invalid_dates_fails_validation(self):
        payload = {
            "title": "Invalid Trip",
            "start_date": "2026-09-15",
            "end_date": "2026-09-01",
        }
        serializer = TripSerializer(data=payload)
        assert not serializer.is_valid()
        assert "end_date" in serializer.errors

    def test_patch_single_field_validates_against_instance(self):
        trip = TripFactory(
            start_date=datetime.date(2026, 8, 10),
            end_date=datetime.date(2026, 8, 20),
        )
        # Attempt to patch start_date to after existing end_date
        payload = {"start_date": "2026-08-25"}
        serializer = TripSerializer(instance=trip, data=payload, partial=True)
        assert not serializer.is_valid()
        assert "end_date" in serializer.errors


@pytest.mark.django_db
class TestStopSerializer:
    def test_valid_stop_serializer_with_context(self):
        trip = TripFactory(
            start_date=datetime.date(2026, 8, 1),
            end_date=datetime.date(2026, 8, 20),
        )
        payload = {
            "name": "Tokyo Tower",
            "description": "City viewpoint",
            "location": "Tokyo",
            "arrival_date": "2026-08-05",
            "departure_date": "2026-08-08",
        }
        serializer = StopSerializer(data=payload, context={"trip": trip})
        assert serializer.is_valid(), serializer.errors
        stop = serializer.save(trip=trip)
        assert stop.name == "Tokyo Tower"
        assert stop.trip == trip

    def test_stop_order_auto_assigned_when_omitted(self):
        trip = TripFactory()
        StopFactory(trip=trip, order=0)
        StopFactory(trip=trip, order=1)

        payload = {
            "name": "Third Stop",
            "location": "City Center",
            "arrival_date": str(trip.start_date),
            "departure_date": str(trip.start_date + datetime.timedelta(days=1)),
        }
        serializer = StopSerializer(data=payload, context={"trip": trip})
        assert serializer.is_valid(), serializer.errors
        stop = serializer.save(trip=trip)
        assert stop.order == 2

    def test_departure_before_arrival_fails(self):
        trip = TripFactory()
        payload = {
            "name": "Backward Stop",
            "location": "Location",
            "arrival_date": str(trip.start_date + datetime.timedelta(days=5)),
            "departure_date": str(trip.start_date + datetime.timedelta(days=2)),
        }
        serializer = StopSerializer(data=payload, context={"trip": trip})
        assert not serializer.is_valid()
        assert "departure_date" in serializer.errors

    def test_arrival_before_trip_start_fails(self):
        trip = TripFactory(
            start_date=datetime.date(2026, 8, 5),
            end_date=datetime.date(2026, 8, 20),
        )
        payload = {
            "name": "Early Stop",
            "location": "Location",
            "arrival_date": "2026-08-01",
            "departure_date": "2026-08-07",
        }
        serializer = StopSerializer(data=payload, context={"trip": trip})
        assert not serializer.is_valid()
        assert "arrival_date" in serializer.errors

    def test_departure_after_trip_end_fails(self):
        trip = TripFactory(end_date=datetime.date(2026, 8, 15))
        payload = {
            "name": "Late Stop",
            "location": "Location",
            "arrival_date": "2026-08-10",
            "departure_date": "2026-08-20",
        }
        serializer = StopSerializer(data=payload, context={"trip": trip})
        assert not serializer.is_valid()
        assert "departure_date" in serializer.errors

    def test_patch_arrival_date_only_validates_against_instance(self):
        trip = TripFactory(
            start_date=datetime.date(2026, 8, 1),
            end_date=datetime.date(2026, 8, 20),
        )
        stop = StopFactory(
            trip=trip,
            arrival_date=datetime.date(2026, 8, 5),
            departure_date=datetime.date(2026, 8, 10),
        )
        # Patch arrival_date to after existing departure_date
        payload = {"arrival_date": "2026-08-15"}
        serializer = StopSerializer(instance=stop, data=payload, partial=True)
        assert not serializer.is_valid()
        assert "departure_date" in serializer.errors


@pytest.mark.django_db
class TestAuthSerializers:
    def test_register_serializer_success(self):
        from trips.auth_serializers import RegisterSerializer

        payload = {
            "username": "new_explorer",
            "email": "new_explorer@example.com",
            "password": "SecurePassword123!",
        }
        serializer = RegisterSerializer(data=payload)
        assert serializer.is_valid(), serializer.errors
        data = serializer.save()
        assert data["user"].username == "new_explorer"
        assert "access" in data
        assert "refresh" in data

    def test_profile_serializer_updates_fields(self, user):
        from trips.auth_serializers import ProfileSerializer

        profile = user.profile
        serializer = ProfileSerializer(
            instance=profile,
            data={
                "display_name": "Updated Name",
                "bio": "New Bio",
                "avatar_url": "https://example.com/pic.jpg",
            },
            partial=True,
        )
        assert serializer.is_valid(), serializer.errors
        updated = serializer.save()
        assert updated.display_name == "Updated Name"
        assert updated.bio == "New Bio"
        assert updated.avatar_url == "https://example.com/pic.jpg"
        assert serializer.data["username"] == user.username
