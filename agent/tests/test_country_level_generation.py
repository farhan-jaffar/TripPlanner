"""Tests for country-level generation path and the city/country-name fallback fix."""

from agent.serializers import ItineraryRequestSerializer


class TestSerializerCityCountryFix:
    """Verifies the core bug fix: empty city stays empty, never becomes country name."""

    def test_empty_city_stays_empty(self):
        data = {
            "country": "FR",
            "city": "",
            "start_date": "2026-10-01",
            "end_date": "2026-10-03",
            "interests": ["museums"],
        }
        serializer = ItineraryRequestSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["city"] == ""
        assert serializer.validated_data["is_country_level"] is True

    def test_no_city_field_sets_country_level(self):
        data = {
            "country": "FR",
            "start_date": "2026-10-01",
            "end_date": "2026-10-03",
        }
        serializer = ItineraryRequestSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["city"] == ""
        assert serializer.validated_data["is_country_level"] is True

    def test_city_provided_is_not_country_level(self):
        data = {
            "country": "FR",
            "city": "Paris",
            "start_date": "2026-10-01",
            "end_date": "2026-10-03",
        }
        serializer = ItineraryRequestSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["city"] == "Paris"
        assert serializer.validated_data["is_country_level"] is False

    def test_empty_city_never_becomes_country_name(self):
        """The actual bug fix — 'France' should NEVER appear as city."""
        data = {
            "country": "France",
            "city": "",
            "start_date": "2026-10-01",
            "end_date": "2026-10-03",
        }
        serializer = ItineraryRequestSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        # city must be empty, not "France"
        assert serializer.validated_data["city"] == ""
        assert serializer.validated_data["city"] != "France"
        assert serializer.validated_data["is_country_level"] is True

    def test_whitespace_city_treated_as_empty(self):
        data = {
            "country": "JP",
            "city": "   ",
            "start_date": "2026-10-01",
            "end_date": "2026-10-03",
        }
        serializer = ItineraryRequestSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["city"] == ""
        assert serializer.validated_data["is_country_level"] is True
