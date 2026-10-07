"""Tests for the tripplanner://trips MCP resource and formatting utilities."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest

from mcp_server.api_client import AuthenticationError, TripPlannerAPIError, default_client
from mcp_server.formatting import format_stop, format_trip
from mcp_server.server import trips_resource


def test_format_stop_basic() -> None:
    raw_stop = {
        "id": 1,
        "name": "Eiffel Tower",
        "location": "Paris, France",
        "order": 0,
        "arrival_date": "2026-07-01",
        "departure_date": "2026-07-02",
        "stop_type": "visit",
        "duration_minutes": 120,
        "description": "Visit top floor",
    }
    formatted = format_stop(raw_stop)
    assert formatted["id"] == 1
    assert formatted["name"] == "Eiffel Tower"
    assert formatted["location"] == "Paris, France"
    assert formatted["arrival_date"] == "2026-07-01"
    assert formatted["departure_date"] == "2026-07-02"
    assert formatted["duration_minutes"] == 120
    assert formatted["description"] == "Visit top floor"


def test_format_stop_omits_none_fields() -> None:
    raw_stop = {
        "id": 2,
        "name": "Local Cafe",
        "location": "Montmartre",
        "order": 1,
        "arrival_date": None,
        "departure_date": None,
        "stop_type": "visit",
        "duration_minutes": None,
        "description": "",
    }
    formatted = format_stop(raw_stop)
    assert formatted["id"] == 2
    assert "arrival_date" not in formatted
    assert "departure_date" not in formatted
    assert "duration_minutes" not in formatted
    assert "description" not in formatted


def test_format_trip_with_nested_stops(sample_trips: list[dict], sample_stops: list[dict]) -> None:
    trip = sample_trips[0]
    formatted = format_trip(trip, sample_stops)
    assert formatted["id"] == 1
    assert formatted["title"] == "European Summer"
    assert formatted["stop_count"] == 2
    assert len(formatted["stops"]) == 2
    assert formatted["stops"][0]["name"] == "Louvre Museum"


@pytest.mark.asyncio
async def test_trips_resource_success(sample_trips: list[dict], sample_stops: list[dict]) -> None:
    formatted_mock = [
        format_trip(sample_trips[0], sample_stops),
        format_trip(sample_trips[1], []),
    ]

    with patch.object(
        default_client,
        "get_all_trips_with_stops",
        new=AsyncMock(return_value=formatted_mock),
    ):
        result_json = await trips_resource()
        data = json.loads(result_json)

        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["id"] == 1
        assert data[0]["stops"][0]["name"] == "Louvre Museum"
        assert data[1]["id"] == 2
        assert data[1]["stops"] == []


@pytest.mark.asyncio
async def test_trips_resource_auth_error() -> None:
    with patch.object(
        default_client,
        "get_all_trips_with_stops",
        side_effect=AuthenticationError("Invalid refresh token"),
    ):
        result_json = await trips_resource()
        data = json.loads(result_json)

        assert "error" in data
        assert data["error"] == "Authentication failed"
        assert "Invalid refresh token" in data["details"]


@pytest.mark.asyncio
async def test_trips_resource_api_error() -> None:
    with patch.object(
        default_client,
        "get_all_trips_with_stops",
        side_effect=TripPlannerAPIError("500 Internal Server Error"),
    ):
        result_json = await trips_resource()
        data = json.loads(result_json)

        assert "error" in data
        assert "500 Internal Server Error" in data["error"]
