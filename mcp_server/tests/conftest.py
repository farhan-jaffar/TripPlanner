"""Pytest fixtures and test setup for Trip Planner MCP server tests."""

from __future__ import annotations

from typing import Any

import pytest

from mcp_server.api_client import default_client


@pytest.fixture(autouse=True)
def setup_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Set mock environment variables for all tests."""
    monkeypatch.setenv("TRIP_PLANNER_API_BASE_URL", "http://testserver/api/v1")
    monkeypatch.setenv("TRIP_PLANNER_REFRESH_TOKEN", "mock_refresh_token_xyz")
    # Reset client access token and URLs
    default_client.base_url = "http://testserver/api/v1"
    default_client.refresh_token = "mock_refresh_token_xyz"
    default_client._access_token = "mock_valid_access_token"


@pytest.fixture
def sample_trips() -> list[dict[str, Any]]:
    return [
        {
            "id": 1,
            "title": "European Summer",
            "description": "Sightseeing across France and Italy",
            "start_date": "2026-07-01",
            "end_date": "2026-07-15",
            "stop_count": 2,
        },
        {
            "id": 2,
            "title": "Kyoto Retreat",
            "description": "Temples and gardens",
            "start_date": "2026-10-01",
            "end_date": "2026-10-10",
            "stop_count": 0,
        },
    ]


@pytest.fixture
def sample_stops() -> list[dict[str, Any]]:
    return [
        {
            "id": 10,
            "trip": 1,
            "name": "Louvre Museum",
            "location": "Rue de Rivoli, 75001 Paris, France",
            "order": 0,
            "arrival_date": "2026-07-02",
            "departure_date": "2026-07-03",
            "stop_type": "visit",
            "duration_minutes": 180,
            "description": "Mona Lisa and sculptures",
        },
        {
            "id": 11,
            "trip": 1,
            "name": "Colosseum",
            "location": "Piazza del Colosseo, Rome, Italy",
            "order": 1,
            "arrival_date": "2026-07-08",
            "departure_date": "2026-07-09",
            "stop_type": "visit",
            "duration_minutes": 120,
            "description": "Ancient arena",
        },
    ]
