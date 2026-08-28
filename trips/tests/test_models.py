import datetime

import pytest
from django.db.utils import IntegrityError

from trips.models import Stop, Trip
from trips.tests.factories import StopFactory, TripFactory


@pytest.mark.django_db
class TestTripModel:
    def test_str_representation(self):
        trip = TripFactory(title="Summer Vacation")
        assert str(trip) == "Summer Vacation"

    def test_check_constraint_end_date_before_start_date_raises_integrity_error(self):
        with pytest.raises(IntegrityError):
            Trip.objects.create(
                title="Invalid Trip",
                start_date=datetime.date(2026, 6, 10),
                end_date=datetime.date(2026, 6, 1),
            )

    def test_default_ordering_by_created_at_desc(self):
        t1 = TripFactory(title="Trip 1")
        t2 = TripFactory(title="Trip 2")
        trips = list(Trip.objects.all())
        assert trips[0] == t2
        assert trips[1] == t1


@pytest.mark.django_db
class TestStopModel:
    def test_str_representation(self):
        trip = TripFactory(title="Euro Tour")
        stop = StopFactory(trip=trip, name="Eiffel Tower")
        assert str(stop) == "Eiffel Tower (Euro Tour)"

    def test_check_constraint_departure_before_arrival_raises_integrity_error(self):
        trip = TripFactory()
        with pytest.raises(IntegrityError):
            Stop.objects.create(
                trip=trip,
                name="Bad Dates",
                location="City Center",
                arrival_date=datetime.date(2026, 7, 10),
                departure_date=datetime.date(2026, 7, 5),
            )

    def test_cascade_deletion_on_trip_delete(self):
        trip = TripFactory()
        stop = StopFactory(trip=trip)
        stop_id = stop.id
        trip.delete()
        assert not Stop.objects.filter(id=stop_id).exists()


@pytest.mark.django_db
class TestProfileModel:
    def test_profile_str_representation(self, user):
        profile = user.profile
        profile.display_name = "Wanderer"
        profile.save()
        assert str(profile) == "Wanderer"

    def test_profile_str_fallback_to_username(self, user):
        profile = user.profile
        profile.display_name = ""
        profile.save()
        assert str(profile) == user.username

