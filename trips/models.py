from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    """
    Abstract base model providing self-updating created_at and updated_at fields.
    """

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Profile(TimeStampedModel):
    """
    User profile storing supplemental personal and preference information.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    display_name = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    avatar_url = models.URLField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.display_name or self.user.get_username()


class Trip(TimeStampedModel):
    """
    Represents a planned travel journey.
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="trips",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField()

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F("start_date")),
                name="trip_end_date_gte_start_date",
            ),
        ]

    def __str__(self) -> str:
        return self.title


class Stop(TimeStampedModel):
    """
    Represents a destination, activity, or stop within a trip.
    """

    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name="stops",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)
    arrival_date = models.DateField(null=True, blank=True)
    departure_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["order", "id"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(arrival_date__isnull=True)
                    | models.Q(departure_date__isnull=True)
                    | models.Q(departure_date__gte=models.F("arrival_date"))
                ),
                name="stop_departure_date_gte_arrival_date",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.trip.title})"

