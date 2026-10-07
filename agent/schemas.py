from typing import Literal

from pydantic import BaseModel, Field


class ItineraryStop(BaseModel):
    """A single stop or activity within a day's itinerary."""

    stop_type: Literal["visit", "transfer"] = Field(
        default="visit",
        description=(
            "Type of stop: 'visit' for a point of interest, 'transfer' for inter-city travel."
        ),
    )
    name: str = Field(description="Name of the venue, attraction, or point of interest.")
    geoapify_place_id: str | None = Field(
        default=None,
        description=(
            "The real Geoapify place_id returned by get_places tool. "
            "Required for 'visit' stops; absent for 'transfer' stops."
        ),
    )
    latitude: float | None = Field(default=None, description="Geographic latitude of the place.")
    longitude: float | None = Field(default=None, description="Geographic longitude of the place.")
    category: str | None = Field(
        default=None,
        description="Category classification (e.g., museum, food, tourism, nature, shopping).",
    )
    suggested_time: str | None = Field(
        default=None,
        description="Suggested start time in 24-hour format HH:MM (e.g. '09:30', '14:00').",
    )
    duration_minutes: int | None = Field(
        default=None,
        description="Duration in minutes. Primarily used for 'transfer' stops.",
    )
    note: str | None = Field(
        default=None,
        description="Practical tips, booking advice, or highlights for the visitor.",
    )
    travel_from_previous: str | None = Field(
        default=None,
        description="Travel time and distance from previous stop (e.g. '15 min walk (1.2 km)').",
    )


class ItineraryDay(BaseModel):
    """An organized itinerary for a single calendar day."""

    date: str = Field(description="Date in YYYY-MM-DD format.")
    city: str = Field(
        default="",
        description="The city this day's activities belong to.",
    )
    weather_summary: str | None = Field(
        default=None,
        description="Forecasted conditions or temperature notes for this day.",
    )
    route_summary: str | None = Field(
        default=None,
        description="Daily transit/walking summary (e.g., 'Total walking: ~45 mins, 3.2 km').",
    )
    stops: list[ItineraryStop] = Field(
        default_factory=list,
        description="Chronologically ordered stops and activities for this day.",
    )


class GeneratedItinerary(BaseModel):
    """The full structured itinerary generated for a trip."""

    trip_title: str = Field(description="Engaging title for the travel journey.")
    cities: list[str] = Field(
        default_factory=list,
        description="Ordered list of cities visited in this itinerary.",
    )
    days: list[ItineraryDay] = Field(
        description="Ordered sequence of daily itineraries covering the date range."
    )
    grounding_notes: str | None = Field(
        default=None,
        description="Informational notes on venue verification or omissions if needed.",
    )
