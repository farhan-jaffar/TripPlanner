import itertools
import logging
import math
from typing import Any

from .schemas import GeneratedItinerary, ItineraryDay, ItineraryStop

logger = logging.getLogger(__name__)


class GroundingError(Exception):
    """Raised when an itinerary cannot meet the minimum grounded place threshold."""


EARTH_RADIUS_KM = 6371.0


def haversine_km(stop_a: ItineraryStop, stop_b: ItineraryStop) -> float:
    """
    Computes the great-circle distance in kilometres between two stops
    using the Haversine formula. Requires lat/lng on both stops.
    """
    if (
        stop_a.latitude is None
        or stop_a.longitude is None
        or stop_b.latitude is None
        or stop_b.longitude is None
    ):
        return 0.0

    lat1, lon1 = math.radians(stop_a.latitude), math.radians(stop_a.longitude)
    lat2, lon2 = math.radians(stop_b.latitude), math.radians(stop_b.longitude)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def verify_and_filter_grounding(
    itinerary: GeneratedItinerary,
    session_real_places: dict[str, dict[str, Any]],
) -> tuple[GeneratedItinerary, bool]:
    """
    Verifies every stop against real Geoapify results fetched in this session.
    Transfer stops (stop_type="transfer") are exempt from grounding checks.

    Returns:
        (sanitized_itinerary, needs_retry)
        - needs_retry: True if >30% of total proposed visit stops failed grounding.
    """
    total_stops = 0
    failed_stops = 0
    cleaned_days: list[ItineraryDay] = []

    for day in itinerary.days:
        verified_stops: list[ItineraryStop] = []
        for stop in day.stops:
            # Transfer stops pass through without grounding check
            if stop.stop_type == "transfer":
                verified_stops.append(stop)
                continue

            total_stops += 1
            place_id = (stop.geoapify_place_id or "").strip()

            if place_id in session_real_places:
                # Grounded in real API result: enrich coordinates and verified venue name
                real = session_real_places[place_id]
                verified_stops.append(
                    ItineraryStop(
                        stop_type="visit",
                        name=real.get("name", stop.name),
                        geoapify_place_id=place_id,
                        latitude=real.get("latitude", stop.latitude),
                        longitude=real.get("longitude", stop.longitude),
                        category=stop.category or real.get("category", "tourism"),
                        suggested_time=stop.suggested_time,
                        note=stop.note,
                        travel_from_previous=stop.travel_from_previous,
                    )
                )
            else:
                # Hallucinated or unknown place ID
                failed_stops += 1
                logger.warning(
                    "Dropping ungrounded stop '%s' (unrecognized place_id: '%s')",
                    stop.name,
                    place_id,
                )

        cleaned_days.append(
            ItineraryDay(
                date=day.date,
                city=day.city,
                weather_summary=day.weather_summary,
                route_summary=day.route_summary,
                stops=verified_stops,
            )
        )

    failure_ratio = (failed_stops / total_stops) if total_stops > 0 else 0.0
    needs_retry = failure_ratio > 0.30

    grounding_note = itinerary.grounding_notes
    if failed_stops > 0:
        grounding_note = (
            "Some unverified activities were omitted to ensure all "
            "recommendations are real places."
        )

    filtered_itinerary = GeneratedItinerary(
        trip_title=itinerary.trip_title,
        cities=itinerary.cities,
        days=cleaned_days,
        grounding_notes=grounding_note,
    )

    return filtered_itinerary, needs_retry


def validate_density(
    day: ItineraryDay,
    min_stops: int = 2,
    max_stops: int = 6,
    max_km_apart: float = 15.0,
) -> list[str]:
    """
    Validates that a single day has a sensible number of visit stops and that
    they are geographically close enough to be realistic for a single day.

    Returns a list of warning strings (empty means pass).
    No extra API call — reuses the lat/lng already on each grounded stop.
    """
    warnings: list[str] = []
    visits = [s for s in day.stops if s.stop_type == "visit"]

    if len(visits) < min_stops:
        warnings.append(
            f"{len(visits)} visit stop(s) on {day.date} — below expected minimum of {min_stops}"
        )
    elif len(visits) > max_stops:
        warnings.append(
            f"{len(visits)} visit stops on {day.date} — exceeds recommended maximum of {max_stops}"
        )

    for a, b in itertools.combinations(visits, 2):
        dist = haversine_km(a, b)
        if dist > max_km_apart:
            warnings.append(
                f"'{a.name}' and '{b.name}' are {dist:.0f} km apart on {day.date} "
                f"— likely belong on separate days"
            )

    return warnings


def validate_minimum_density(itinerary: GeneratedItinerary) -> None:
    """
    Ensures the itinerary has at least 1 verified stop per day on average,
    and no completely empty days if possible.
    Raises GroundingError if the itinerary is depleted below threshold.

    Also runs per-day density validation and logs any warnings.
    """
    total_days = len(itinerary.days)
    total_stops = sum(len([s for s in d.stops if s.stop_type == "visit"]) for d in itinerary.days)

    if total_days > 0 and (total_stops / total_days) < 1.0:
        raise GroundingError(
            "Could not verify enough genuine attractions for this destination and dates. "
            "Please try with adjusted preferences or dates."
        )

    # Per-day density warnings (non-fatal, logged)
    all_warnings: list[str] = []
    for day in itinerary.days:
        day_warnings = validate_density(day)
        all_warnings.extend(day_warnings)

    if all_warnings:
        for w in all_warnings:
            logger.info("Density warning: %s", w)
