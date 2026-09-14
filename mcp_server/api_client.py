"""HTTP client for the Trip Planner REST API with automatic JWT refresh and error handling."""

from __future__ import annotations

import asyncio
import contextlib
import json
import os
import time
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

from .formatting import format_trip

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_ENV_PATH = Path(__file__).resolve().parent / ".env"
_CACHE_PATH = Path(__file__).resolve().parent / ".token_cache.json"


def _load_cached_tokens() -> tuple[str | None, str | None]:
    """Load cached access and refresh tokens if access token is still fresh."""
    if _CACHE_PATH.exists():
        with contextlib.suppress(Exception):
            data = json.loads(_CACHE_PATH.read_text(encoding="utf-8"))
            timestamp = data.get("timestamp", 0)
            # Access tokens valid for 15m; use if under 12m (720s) old
            access = data.get("access") if (time.time() - timestamp < 720) else None
            refresh = data.get("refresh")
            return access, refresh
    return None, None


def _update_config_files(refresh: str) -> None:
    """Update refresh token in local and global mcp_config.json files."""
    paths = [
        _PROJECT_ROOT / ".agents" / "mcp_config.json",
        Path.home() / ".gemini" / "config" / "mcp_config.json",
    ]
    for p in paths:
        if p.exists():
            with contextlib.suppress(Exception):
                data = json.loads(p.read_text(encoding="utf-8"))
                server_cfg = data.get("mcpServers", {}).get("trip-planner", {})
                if "env" in server_cfg and "TRIP_PLANNER_REFRESH_TOKEN" in server_cfg["env"]:
                    server_cfg["env"]["TRIP_PLANNER_REFRESH_TOKEN"] = refresh
                    p.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _persist_tokens(access: str | None, refresh: str | None, base_url: str) -> None:
    """Save rotated refresh token to .env, update mcp_config.json, and cache access token."""
    if "testserver" in base_url:
        return

    if refresh:
        with contextlib.suppress(Exception):
            _ENV_PATH.write_text(
                f"TRIP_PLANNER_API_BASE_URL={base_url}\nTRIP_PLANNER_REFRESH_TOKEN={refresh}\n",
                encoding="utf-8",
            )

        _update_config_files(refresh)

    with contextlib.suppress(Exception):
        cache_data = {
            "access": access,
            "refresh": refresh,
            "timestamp": time.time(),
        }
        _CACHE_PATH.write_text(json.dumps(cache_data), encoding="utf-8")


# Load environment variables with override so freshest .env values apply
if _ENV_PATH.exists():
    load_dotenv(_ENV_PATH, override=True)
else:
    load_dotenv(override=True)


class TripPlannerAPIError(Exception):
    """Base exception for Trip Planner API errors."""


class AuthenticationError(TripPlannerAPIError):
    """Raised when authentication or token refresh fails."""


class ResourceNotFoundError(TripPlannerAPIError):
    """Raised when a requested resource (trip or stop) is not found (404)."""


class ValidationError(TripPlannerAPIError):
    """Raised when the API rejects input data (400 Bad Request)."""

    def __init__(self, message: str, details: Any = None) -> None:
        super().__init__(message)
        self.details = details


class TripPlannerClient:
    """Async HTTP client managing authenticated requests to Trip Planner REST API."""

    def __init__(
        self,
        base_url: str | None = None,
        refresh_token: str | None = None,
        timeout: float = 15.0,
    ) -> None:
        if _ENV_PATH.exists():
            load_dotenv(_ENV_PATH, override=True)

        self.base_url = (
            base_url or os.getenv("TRIP_PLANNER_API_BASE_URL", "http://127.0.0.1:8000/api/v1")
        ).rstrip("/")

        cached_access, cached_refresh = _load_cached_tokens()
        self.refresh_token = (
            cached_refresh or os.getenv("TRIP_PLANNER_REFRESH_TOKEN", "") or refresh_token or ""
        )
        self.timeout = timeout
        self._access_token: str | None = cached_access
        self._client: httpx.AsyncClient | None = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None or getattr(self._client, "is_closed", False) is True:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client

    async def close(self) -> None:
        """Close underlying HTTP client session."""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()

    async def refresh_access_token(self) -> str:
        """Exchange refresh token for a new access token via /auth/token/refresh/."""
        if not self.refresh_token:
            raise AuthenticationError(
                "TRIP_PLANNER_REFRESH_TOKEN is not set. Please run `python mcp_server/auth.py` "
                "or provide a valid refresh token."
            )

        refresh_url = f"{self.base_url}/auth/token/refresh/"
        try:
            response = await self.client.post(
                refresh_url,
                json={"refresh": self.refresh_token},
            )
        except httpx.RequestError as exc:
            raise AuthenticationError(
                f"Failed to reach authentication endpoint at {refresh_url}: {exc}"
            ) from exc

        if response.status_code != 200:
            raise AuthenticationError(
                f"Token refresh failed with status {response.status_code}: {response.text}"
            )

        data = response.json()
        new_access = data.get("access")
        new_refresh = data.get("refresh")
        if not new_access:
            raise AuthenticationError(
                f"Token refresh response did not contain 'access' key: {response.text}"
            )

        self._access_token = new_access
        if new_refresh:
            self.refresh_token = new_refresh

        _persist_tokens(self._access_token, self.refresh_token, self.base_url)
        return new_access

    async def request(
        self,
        method: str,
        path: str,
        *,
        headers: dict[str, str] | None = None,
        **kwargs: Any,
    ) -> httpx.Response:
        """Execute an HTTP request with automatic token injection and 401 retry interceptor."""
        req_headers = headers.copy() if headers else {}
        custom_auth = "Authorization" in req_headers

        if not custom_auth:
            if not self._access_token:
                await self.refresh_access_token()
            req_headers["Authorization"] = f"Bearer {self._access_token}"

        url = f"{self.base_url}/{path.lstrip('/')}"

        try:
            response = await self.client.request(
                method,
                url,
                headers=req_headers,
                **kwargs,
            )
        except httpx.RequestError as exc:
            raise TripPlannerAPIError(f"HTTP request to {url} failed: {exc}") from exc

        # 401 Unauthorized interceptor:
        if response.status_code == 401:
            if custom_auth:
                raw_token = req_headers.get("Authorization", "").replace("Bearer ", "").strip()
                with contextlib.suppress(Exception):
                    refresh_resp = await self.client.post(
                        f"{self.base_url}/auth/token/refresh/",
                        json={"refresh": raw_token},
                    )
                    if refresh_resp.status_code == 200:
                        new_tok = refresh_resp.json().get("access")
                        req_headers["Authorization"] = f"Bearer {new_tok}"
                        response = await self.client.request(
                            method,
                            url,
                            headers=req_headers,
                            **kwargs,
                        )

            if response.status_code == 401 and not custom_auth:
                await self.refresh_access_token()
                req_headers["Authorization"] = f"Bearer {self._access_token}"
                try:
                    response = await self.client.request(
                        method,
                        url,
                        headers=req_headers,
                        **kwargs,
                    )
                except httpx.RequestError as exc:
                    err_msg = f"HTTP retry request to {url} failed: {exc}"
                    raise TripPlannerAPIError(err_msg) from exc

            if response.status_code == 401:
                raise AuthenticationError(
                    f"Authentication failed after token refresh (401): {response.text}"
                )

        return response

    async def get_trips(self, page_size: int = 100) -> list[dict[str, Any]]:
        """Retrieve user's trips from the API."""
        resp = await self.request("GET", f"trips/?page_size={page_size}")
        if resp.status_code != 200:
            raise TripPlannerAPIError(
                f"Failed to fetch trips (status {resp.status_code}): {resp.text}"
            )

        data = resp.json()
        if isinstance(data, dict) and "results" in data:
            return data["results"]
        if isinstance(data, list):
            return data
        return []

    async def get_trip_stops(self, trip_id: int, page_size: int = 100) -> list[dict[str, Any]]:
        """Retrieve stops for a specific trip."""
        resp = await self.request("GET", f"trips/{trip_id}/stops/?page_size={page_size}")
        if resp.status_code == 404:
            raise ResourceNotFoundError(
                f"Trip {trip_id} not found or you do not have permission to view it."
            )
        if resp.status_code != 200:
            err_msg = f"Failed to fetch stops for trip {trip_id} ({resp.status_code}): {resp.text}"
            raise TripPlannerAPIError(err_msg)

        data = resp.json()
        if isinstance(data, dict) and "results" in data:
            return data["results"]
        if isinstance(data, list):
            return data
        return []

    async def get_all_trips_with_stops(self) -> list[dict[str, Any]]:
        """Fetch all trips and their nested stops concurrently, formatted for LLM consumption."""
        trips = await self.get_trips(page_size=100)
        if not trips:
            return []

        async def _fetch_trip_stops(trip: dict[str, Any]) -> dict[str, Any]:
            trip_id = trip["id"]
            try:
                stops = await self.get_trip_stops(trip_id, page_size=100)
            except ResourceNotFoundError:
                stops = []
            return format_trip(trip, stops)

        formatted_trips = await asyncio.gather(*[_fetch_trip_stops(t) for t in trips])
        return list(formatted_trips)

    async def create_stop(
        self,
        trip_id: int,
        stop_data: dict[str, Any],
        auth_token: str | None = None,
    ) -> dict[str, Any]:
        """Create a new stop under a trip.

        Raises:
            ResourceNotFoundError: If the trip does not exist or user doesn't own it.
            ValidationError: If validation fails (e.g. date constraints, missing fields).
            TripPlannerAPIError: If another API error occurs.
        """
        headers = {}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"

        resp = await self.request(
            "POST",
            f"trips/{trip_id}/stops/",
            json=stop_data,
            headers=headers if headers else None,
        )

        if resp.status_code == 201:
            return resp.json()

        if resp.status_code == 404:
            raise ResourceNotFoundError(
                f"Trip with ID {trip_id} was not found or is not owned by your account."
            )

        if resp.status_code == 400:
            try:
                error_data = resp.json()
            except Exception:
                error_data = resp.text
            raise ValidationError(
                f"Validation error creating stop: {error_data}",
                details=error_data,
            )

        raise TripPlannerAPIError(
            f"Failed to create stop (status {resp.status_code}): {resp.text}"
        )


# Global default client instance
default_client = TripPlannerClient()
