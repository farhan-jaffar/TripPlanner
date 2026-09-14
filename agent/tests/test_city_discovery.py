"""Tests for city discovery via GeoNames."""

from dataclasses import asdict
from unittest.mock import MagicMock, patch

from agent.city_discovery import (
    CityCandidate,
    discover_cities,
    max_cities_for_duration,
)


class TestMaxCitiesForDuration:
    def test_1_to_3_days_returns_1(self):
        assert max_cities_for_duration(1) == 1
        assert max_cities_for_duration(2) == 1
        assert max_cities_for_duration(3) == 1

    def test_4_to_6_days_returns_2(self):
        assert max_cities_for_duration(4) == 2
        assert max_cities_for_duration(5) == 2
        assert max_cities_for_duration(6) == 2

    def test_7_to_10_days_returns_3(self):
        assert max_cities_for_duration(7) == 3
        assert max_cities_for_duration(10) == 3

    def test_11_to_14_days_returns_4(self):
        assert max_cities_for_duration(11) == 4
        assert max_cities_for_duration(14) == 4

    def test_over_14_returns_4(self):
        assert max_cities_for_duration(30) == 4


MOCK_GEONAMES_RESPONSE = {
    "geonames": [
        {"name": "Paris", "lat": "48.8566", "lng": "2.3522", "population": 2161000},
        {"name": "Lyon", "lat": "45.764", "lng": "4.8357", "population": 516092},
        {"name": "Marseille", "lat": "43.2965", "lng": "5.3698", "population": 861635},
        {"name": "Toulouse", "lat": "43.6047", "lng": "1.4442", "population": 471941},
        {"name": "Nice", "lat": "43.7102", "lng": "7.262", "population": 342522},
        {"name": "Small Town", "lat": "44.0", "lng": "3.0", "population": 10000},
    ]
}


class TestDiscoverCities:
    @patch("agent.city_discovery.requests.get")
    @patch("agent.city_discovery.record_outbound_call")
    def test_parses_geonames_response(self, mock_record, mock_get, settings):
        settings.GEONAMES_USERNAME = "testuser"
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = MOCK_GEONAMES_RESPONSE
        mock_get.return_value = mock_resp

        candidates = discover_cities("FR")

        assert len(candidates) == 5  # Small Town filtered out (<50k)
        assert candidates[0].name == "Paris"
        assert candidates[0].population == 2161000
        assert isinstance(candidates[0].lat, float)
        mock_record.assert_called_once_with("geonames", 1)

    @patch("agent.city_discovery.requests.get")
    @patch("agent.city_discovery.record_outbound_call")
    def test_resorts_by_population(self, mock_record, mock_get, settings):
        """Client-side re-sort corrects GeoNames ordering quirks."""
        settings.GEONAMES_USERNAME = "testuser"
        # GeoNames returns in wrong order
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "geonames": [
                {"name": "Lyon", "lat": "45.764", "lng": "4.8357", "population": 516092},
                {"name": "Paris", "lat": "48.8566", "lng": "2.3522", "population": 2161000},
                {"name": "Marseille", "lat": "43.2965", "lng": "5.3698", "population": 861635},
            ]
        }
        mock_get.return_value = mock_resp

        candidates = discover_cities("FR")

        assert candidates[0].name == "Paris"
        assert candidates[1].name == "Marseille"
        assert candidates[2].name == "Lyon"

    @patch("agent.city_discovery.requests.get")
    @patch("agent.city_discovery.record_outbound_call")
    def test_filters_below_50k(self, mock_record, mock_get, settings):
        settings.GEONAMES_USERNAME = "testuser"
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "geonames": [
                {"name": "Big City 1", "lat": "48.0", "lng": "2.0", "population": 100000},
                {"name": "Big City 2", "lat": "47.0", "lng": "2.0", "population": 80000},
                {"name": "Big City 3", "lat": "46.0", "lng": "2.0", "population": 60000},
                {"name": "Tiny Town", "lat": "45.0", "lng": "2.0", "population": 3000},
                {"name": "Small Village", "lat": "44.0", "lng": "2.0", "population": 500},
            ]
        }
        mock_get.return_value = mock_resp

        candidates = discover_cities("FR")

        assert len(candidates) == 3
        assert [c.name for c in candidates] == ["Big City 1", "Big City 2", "Big City 3"]

    @patch("agent.city_discovery.requests.get")
    @patch("agent.city_discovery.record_outbound_call")
    def test_fallback_for_small_countries(self, mock_record, mock_get, settings):
        """When fewer than 3 candidates pass 50k, return top-5 regardless."""
        settings.GEONAMES_USERNAME = "testuser"
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "geonames": [
                {"name": "Reykjavik", "lat": "64.1", "lng": "-21.9", "population": 131136},
                {"name": "Kopavogur", "lat": "64.1", "lng": "-21.9", "population": 36975},
                {"name": "Hafnarfjordur", "lat": "64.1", "lng": "-21.9", "population": 29799},
                {"name": "Akureyri", "lat": "65.7", "lng": "-18.1", "population": 19000},
                {"name": "Selfoss", "lat": "63.9", "lng": "-21.0", "population": 7500},
                {"name": "Isafjordur", "lat": "66.1", "lng": "-23.1", "population": 2600},
            ]
        }
        mock_get.return_value = mock_resp

        candidates = discover_cities("IS")

        # Only 1 city passes 50k, so fallback to top-5
        assert len(candidates) == 5
        assert candidates[0].name == "Reykjavik"
        assert candidates[4].name == "Selfoss"

    @patch("agent.city_discovery.get_city_candidates")
    def test_cache_hit_avoids_api_call(self, mock_cache_get, settings):
        settings.GEONAMES_USERNAME = "testuser"
        cached_data = [
            asdict(CityCandidate(name="Paris", lat=48.86, lng=2.35, population=2161000)),
        ]
        mock_cache_get.return_value = cached_data

        with patch("agent.city_discovery.requests.get") as mock_get:
            candidates = discover_cities("FR")

        mock_get.assert_not_called()
        assert len(candidates) == 1
        assert candidates[0].name == "Paris"
