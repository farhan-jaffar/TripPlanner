import pytest

from agent.grounding import (
    GroundingError,
    validate_minimum_density,
    verify_and_filter_grounding,
)
from agent.schemas import GeneratedItinerary, ItineraryDay, ItineraryStop


def test_grounding_strips_hallucinated_place_id(mock_places_list):
    session_places = {p["geoapify_place_id"]: p for p in mock_places_list}

    raw_itinerary = GeneratedItinerary(
        trip_title="Trip to Paris",
        cities=["Paris"],
        days=[
            ItineraryDay(
                date="2026-10-01",
                city="Paris",
                stops=[
                    ItineraryStop(
                        name="Louvre Museum",
                        geoapify_place_id="geo_louvre_123",  # Real ID
                        latitude=48.8,
                        longitude=2.3,
                        category="museum",
                        suggested_time="10:00",
                        note="Verified museum",
                    ),
                    ItineraryStop(
                        name="Fictional Flying Cafe",
                        geoapify_place_id="hallucinated_id_999",  # Hallucinated ID
                        latitude=48.8,
                        longitude=2.3,
                        category="food",
                        suggested_time="13:00",
                        note="Never returned by Geoapify",
                    ),
                ],
            )
        ],
    )

    cleaned, needs_retry = verify_and_filter_grounding(raw_itinerary, session_places)

    # Hallucinated stop must be stripped
    assert len(cleaned.days[0].stops) == 1
    assert cleaned.days[0].stops[0].name == "Louvre Museum"
    assert cleaned.days[0].stops[0].geoapify_place_id == "geo_louvre_123"
    assert cleaned.grounding_notes is not None


def test_grounding_flags_retry_when_over_30_percent_fail(mock_places_list):
    session_places = {p["geoapify_place_id"]: p for p in mock_places_list}

    # 1 real stop, 3 hallucinated stops -> 75% failure > 30% threshold
    raw_itinerary = GeneratedItinerary(
        trip_title="Hallucinated Heavy Trip",
        cities=["Paris"],
        days=[
            ItineraryDay(
                date="2026-10-01",
                city="Paris",
                stops=[
                    ItineraryStop(
                        name="Louvre Museum",
                        geoapify_place_id="geo_louvre_123",
                        latitude=48.8,
                        longitude=2.3,
                        category="museum",
                        suggested_time="10:00",
                        note="Real",
                    ),
                    ItineraryStop(
                        name="Fake Place 1",
                        geoapify_place_id="fake_1",
                        latitude=48.8,
                        longitude=2.3,
                        category="tourism",
                        suggested_time="12:00",
                        note="Fake",
                    ),
                    ItineraryStop(
                        name="Fake Place 2",
                        geoapify_place_id="fake_2",
                        latitude=48.8,
                        longitude=2.3,
                        category="tourism",
                        suggested_time="14:00",
                        note="Fake",
                    ),
                    ItineraryStop(
                        name="Fake Place 3",
                        geoapify_place_id="fake_3",
                        latitude=48.8,
                        longitude=2.3,
                        category="tourism",
                        suggested_time="16:00",
                        note="Fake",
                    ),
                ],
            )
        ],
    )

    cleaned, needs_retry = verify_and_filter_grounding(raw_itinerary, session_places)
    assert needs_retry is True
    assert len(cleaned.days[0].stops) == 1


def test_validate_minimum_density_raises_error_when_depleted():
    depleted_itinerary = GeneratedItinerary(
        trip_title="Depleted Trip",
        cities=["Paris"],
        days=[
            ItineraryDay(date="2026-10-01", city="Paris", stops=[]),
            ItineraryDay(date="2026-10-02", city="Paris", stops=[]),
            ItineraryDay(
                date="2026-10-03",
                city="Paris",
                stops=[
                    ItineraryStop(
                        name="Single Stop",
                        geoapify_place_id="geo_1",
                        latitude=48.0,
                        longitude=2.0,
                        category="museum",
                        suggested_time="10:00",
                        note="Lonely stop",
                    )
                ],
            ),
        ],
    )

    with pytest.raises(GroundingError) as exc_info:
        validate_minimum_density(depleted_itinerary)
    assert "Could not verify enough genuine attractions" in str(exc_info.value)


def test_transfer_stops_exempt_from_grounding(mock_places_list):
    """Transfer stops should pass through grounding without a place_id check."""
    session_places = {p["geoapify_place_id"]: p for p in mock_places_list}

    raw_itinerary = GeneratedItinerary(
        trip_title="Multi-City Trip",
        cities=["Paris", "Lyon"],
        days=[
            ItineraryDay(
                date="2026-10-01",
                city="Paris",
                stops=[
                    ItineraryStop(
                        name="Louvre Museum",
                        geoapify_place_id="geo_louvre_123",
                        latitude=48.8,
                        longitude=2.3,
                        category="museum",
                        suggested_time="10:00",
                        note="Real stop",
                    ),
                    ItineraryStop(
                        stop_type="transfer",
                        name="Paris → Lyon",
                        duration_minutes=120,
                        note="Approx. 465 km by drive",
                    ),
                ],
            ),
        ],
    )

    cleaned, needs_retry = verify_and_filter_grounding(raw_itinerary, session_places)

    assert needs_retry is False
    assert len(cleaned.days[0].stops) == 2
    # Visit stop grounded
    assert cleaned.days[0].stops[0].stop_type == "visit"
    assert cleaned.days[0].stops[0].geoapify_place_id == "geo_louvre_123"
    # Transfer stop passed through unchanged
    assert cleaned.days[0].stops[1].stop_type == "transfer"
    assert cleaned.days[0].stops[1].name == "Paris → Lyon"
    assert cleaned.days[0].stops[1].duration_minutes == 120


def test_visit_stops_still_require_grounding(mock_places_list):
    """Visit stops without valid place_id are still dropped."""
    session_places = {p["geoapify_place_id"]: p for p in mock_places_list}

    raw_itinerary = GeneratedItinerary(
        trip_title="Mixed Trip",
        cities=["Paris"],
        days=[
            ItineraryDay(
                date="2026-10-01",
                city="Paris",
                stops=[
                    ItineraryStop(
                        stop_type="visit",
                        name="Invented Place",
                        geoapify_place_id="not_a_real_id",
                        latitude=48.8,
                        longitude=2.3,
                        category="tourism",
                        suggested_time="10:00",
                        note="Hallucinated",
                    ),
                    ItineraryStop(
                        stop_type="transfer",
                        name="Paris → Lyon",
                        duration_minutes=120,
                        note="Transfer",
                    ),
                ],
            ),
        ],
    )

    cleaned, _ = verify_and_filter_grounding(raw_itinerary, session_places)

    # Visit stop dropped (hallucinated), transfer survives
    assert len(cleaned.days[0].stops) == 1
    assert cleaned.days[0].stops[0].stop_type == "transfer"
