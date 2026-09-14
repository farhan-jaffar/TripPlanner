"""Tests for the add_stop MCP tool and API client error handling."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from mcp_server.api_client import (
    AuthenticationError,
    ResourceNotFoundError,
    TripPlannerClient,
    ValidationError,
    default_client,
)
from mcp_server.server import add_stop


@pytest.mark.asyncio
async def test_add_stop_success() -> None:
    created_stop_response = {
        "id": 42,
        "trip": 1,
        "name": "Eiffel Tower",
        "location": "Champ de Mars, 5 Av. Anatole France, 75007 Paris",
        "description": "Visit summit at sunset",
        "order": 0,
        "arrival_date": "2026-07-02",
        "departure_date": "2026-07-02",
        "stop_type": "visit",
        "duration_minutes": 120,
    }

    with patch.object(
        default_client,
        "create_stop",
        new=AsyncMock(return_value=created_stop_response),
    ) as mock_create:
        result_json = await add_stop(
            trip_id=1,
            name="Eiffel Tower",
            location="Champ de Mars, 5 Av. Anatole France, 75007 Paris",
            arrival_date="2026-07-02",
            departure_date="2026-07-02",
            description="Visit summit at sunset",
            duration_minutes=120,
        )

        data = json.loads(result_json)
        assert data["status"] == "success"
        assert "Eiffel Tower" in data["message"]
        assert data["stop"]["id"] == 42
        assert data["stop"]["name"] == "Eiffel Tower"
        assert data["stop"]["location"] == "Champ de Mars, 5 Av. Anatole France, 75007 Paris"

        mock_create.assert_awaited_once_with(
            1,
            {
                "name": "Eiffel Tower",
                "location": "Champ de Mars, 5 Av. Anatole France, 75007 Paris",
                "description": "Visit summit at sunset",
                "stop_type": "visit",
                "arrival_date": "2026-07-02",
                "departure_date": "2026-07-02",
                "duration_minutes": 120,
            },
        )


@pytest.mark.asyncio
async def test_add_stop_location_fallbacks() -> None:
    created_stop = {
        "id": 43,
        "name": "Arc de Triomphe",
        "location": "Paris, France",
        "order": 1,
    }

    with patch.object(
        default_client,
        "create_stop",
        new=AsyncMock(return_value=created_stop),
    ) as mock_create:
        # 1. Location empty, should use city + country
        result = await add_stop(
            trip_id=1,
            name="Arc de Triomphe",
            location="",
            city="Paris",
            country="France",
        )
        assert json.loads(result)["status"] == "success"
        assert mock_create.call_args[0][1]["location"] == "Paris, France"

        # 2. Location, city, and country all empty: fallback to name
        await add_stop(
            trip_id=1,
            name="Arc de Triomphe",
            location="",
            city="",
            country="",
        )
        assert mock_create.call_args[0][1]["location"] == "Arc de Triomphe"


@pytest.mark.asyncio
async def test_add_stop_validation_error_400() -> None:
    with patch.object(
        default_client,
        "create_stop",
        side_effect=ValidationError(
            "Validation error: arrival_date must fall within trip date range",
            details={"arrival_date": ["Must fall within the trip's date range."]},
        ),
    ):
        result_json = await add_stop(
            trip_id=1,
            name="Out of bounds stop",
            location="Paris",
            arrival_date="2027-01-01",
        )

        data = json.loads(result_json)
        assert data["status"] == "error"
        assert data["error_type"] == "validation_error"
        assert "Must fall within the trip's date range" in str(data["details"])
        assert "Strict date constraints" in data["hint"]


@pytest.mark.asyncio
async def test_add_stop_not_found_404() -> None:
    with patch.object(
        default_client,
        "create_stop",
        side_effect=ResourceNotFoundError("Trip 999 not found"),
    ):
        result_json = await add_stop(
            trip_id=999,
            name="Non-existent trip stop",
            location="Unknown",
        )

        data = json.loads(result_json)
        assert data["status"] == "error"
        assert data["error_type"] == "not_found"
        assert "999 was not found" in data["message"]


@pytest.mark.asyncio
async def test_add_stop_authentication_error() -> None:
    with patch.object(
        default_client,
        "create_stop",
        side_effect=AuthenticationError("Invalid refresh token"),
    ):
        result_json = await add_stop(
            trip_id=1,
            name="Museum Stop",
            location="Center",
        )

        data = json.loads(result_json)
        assert data["status"] == "error"
        assert data["error_type"] == "authentication_error"
        assert "Invalid refresh token" in data["message"]


@pytest.mark.asyncio
async def test_api_client_token_refresh_retry() -> None:
    """Test that api_client.request refreshes token and retries upon 401 response."""
    client = TripPlannerClient(
        base_url="http://testserver/api/v1",
        refresh_token="valid_refresh_token",
    )
    client._access_token = "expired_access_token"

    # Mock responses:
    # 1. First request returns 401 Unauthorized
    # 2. Token refresh request returns 200 with new access token
    # 3. Retried request returns 200 OK
    resp_401 = httpx.Response(
        401,
        text="Unauthorized",
        request=httpx.Request("GET", "http://testserver/api/v1/trips/"),
    )
    resp_refresh = httpx.Response(
        200,
        json={"access": "new_fresh_token"},
        request=httpx.Request("POST", "http://testserver/api/v1/auth/token/refresh/"),
    )
    resp_200 = httpx.Response(
        200,
        json=[{"id": 1, "title": "Trip 1"}],
        request=httpx.Request("GET", "http://testserver/api/v1/trips/"),
    )

    mock_http_client = AsyncMock()
    mock_http_client.is_closed = False
    # First request: trips -> 401
    # Second request: post refresh -> 200
    # Third request: trips -> 200
    mock_http_client.request = AsyncMock(side_effect=[resp_401, resp_200])
    mock_http_client.post = AsyncMock(return_value=resp_refresh)
    client._client = mock_http_client

    response = await client.request("GET", "trips/")

    assert response.status_code == 200
    assert response.json() == [{"id": 1, "title": "Trip 1"}]
    assert client._access_token == "new_fresh_token"
    # Ensure client.post was called to refresh token
    mock_http_client.post.assert_awaited_once()
