"""Tests for density validation — the previously undefined diagram box."""

import pytest

from agent.grounding import haversine_km, validate_density
from agent.schemas import ItineraryDay, ItineraryStop


def _visit(name, lat=48.86, lon=2.35):
    """Helper to create a visit stop with given coordinates."""
    return ItineraryStop(
        stop_type="visit",
        name=name,
        geoapify_place_id=f"geo_{name.lower().replace(' ', '_')}",
        latitude=lat,
        longitude=lon,
        category="tourism",
        suggested_time="10:00",
        note="Test stop",
    )


def _transfer(name):
    """Helper to create a transfer stop."""
    return ItineraryStop(
        stop_type="transfer",
        name=name,
        duration_minutes=120,
        note="Transfer by drive",
    )


class TestHaversineKm:
    def test_same_point_returns_zero(self):
        stop = _visit("A", lat=48.86, lon=2.35)
        assert haversine_km(stop, stop) == pytest.approx(0.0, abs=0.01)

    def test_known_distance_paris_to_lyon(self):
        paris = _visit("Paris", lat=48.8566, lon=2.3522)
        lyon = _visit("Lyon", lat=45.764, lon=4.8357)
        dist = haversine_km(paris, lyon)
        # Paris–Lyon is ~391 km
        assert 380 < dist < 400

    def test_none_coordinates_returns_zero(self):
        a = ItineraryStop(stop_type="transfer", name="A")
        b = _visit("B")
        assert haversine_km(a, b) == 0.0


class TestValidateDensity:
    def test_day_with_1_visit_stop_flagged(self):
        day = ItineraryDay(
            date="2026-10-01",
            city="Paris",
            stops=[_visit("Louvre Museum")],
        )
        warnings = validate_density(day)
        assert len(warnings) >= 1
        assert "below expected minimum" in warnings[0]

    def test_day_with_8_visit_stops_flagged(self):
        stops = [_visit(f"Stop {i}") for i in range(8)]
        day = ItineraryDay(date="2026-10-01", city="Paris", stops=stops)
        warnings = validate_density(day)
        assert any("exceeds recommended maximum" in w for w in warnings)

    def test_day_with_3_stops_passes(self):
        stops = [_visit(f"Stop {i}") for i in range(3)]
        day = ItineraryDay(date="2026-10-01", city="Paris", stops=stops)
        warnings = validate_density(day)
        # No count-related warnings (may have distance warnings if coordinates identical)
        count_warnings = [w for w in warnings if "minimum" in w or "maximum" in w]
        assert len(count_warnings) == 0

    def test_stops_40km_apart_flagged(self):
        # Paris center and Fontainebleau (~55 km)
        a = _visit("Louvre", lat=48.8606, lon=2.3376)
        b = _visit("Fontainebleau", lat=48.4044, lon=2.6987)
        day = ItineraryDay(
            date="2026-10-01",
            city="Paris",
            stops=[a, b, _visit("C")],  # Need at least 2 for min threshold
        )
        warnings = validate_density(day)
        distance_warnings = [w for w in warnings if "km apart" in w]
        assert len(distance_warnings) >= 1

    def test_stops_5km_apart_not_flagged(self):
        # Two stops close together in central Paris
        a = _visit("Louvre", lat=48.8606, lon=2.3376)
        b = _visit("Orsay", lat=48.8600, lon=2.3266)
        c = _visit("Tuileries", lat=48.8634, lon=2.3275)
        day = ItineraryDay(
            date="2026-10-01",
            city="Paris",
            stops=[a, b, c],
        )
        warnings = validate_density(day)
        distance_warnings = [w for w in warnings if "km apart" in w]
        assert len(distance_warnings) == 0

    def test_transfer_stops_excluded_from_density(self):
        """Transfer stops should not count toward visit density."""
        day = ItineraryDay(
            date="2026-10-01",
            city="Paris",
            stops=[
                _visit("A"),
                _visit("B"),
                _transfer("Paris → Lyon"),
            ],
        )
        warnings = validate_density(day)
        # 2 visit stops is the minimum — should pass
        count_warnings = [w for w in warnings if "minimum" in w or "maximum" in w]
        assert len(count_warnings) == 0
