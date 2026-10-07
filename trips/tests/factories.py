import datetime

import factory
from django.contrib.auth import get_user_model

from trips.models import Profile, Stop, Trip

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ("username",)

    username = factory.Sequence(lambda n: f"user_{n}")
    email = factory.LazyAttribute(lambda o: f"{o.username}@example.com")
    first_name = "Test"
    last_name = "User"

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        password = kwargs.pop("password", "StrongPass123!")
        user = super()._create(model_class, *args, **kwargs)
        user.set_password(password)
        user.save()
        return user


class ProfileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Profile

    user = factory.SubFactory(UserFactory)
    display_name = factory.LazyAttribute(lambda o: f"Explorer {o.user.username}")
    bio = "Passionate traveler and mapper."
    avatar_url = "https://images.unsplash.com/photo-1534528741775-53994a69daeb"


class TripFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Trip

    owner = factory.SubFactory(UserFactory)
    title = factory.Sequence(lambda n: f"Trip {n}")
    description = "A wonderful travel experience."
    start_date = factory.LazyFunction(lambda: datetime.date(2026, 7, 1))
    end_date = factory.LazyFunction(lambda: datetime.date(2026, 7, 15))


class StopFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Stop

    trip = factory.SubFactory(TripFactory)
    name = factory.Sequence(lambda n: f"Stop {n}")
    description = "Interesting sight or activity."
    location = "Main City Center"
    order = factory.Sequence(lambda n: n)
    arrival_date = factory.LazyAttribute(lambda o: o.trip.start_date)
    departure_date = factory.LazyAttribute(
        lambda o: o.trip.start_date + datetime.timedelta(days=2)
    )
