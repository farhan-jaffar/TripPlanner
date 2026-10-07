"""Canonical definition of the 'add_stop' tool contract for the MCP server."""

from __future__ import annotations

from typing import TypedDict

STOP_TOOL_NAME = "add_stop"

STOP_TOOL_DESCRIPTION = (
    "Add a stop to one of the user's trips. Dates must be ISO format "
    "(YYYY-MM-DD) and departure_date must be >= arrival_date."
)


class StopToolArgs(TypedDict, total=False):
    trip_id: int
    name: str
    arrival_date: str
    departure_date: str
    city: str
    country: str
    description: str
    location: str
    stop_type: str
    duration_minutes: int


STOP_TOOL_REQUIRED = ["trip_id", "name", "arrival_date", "departure_date"]

# Shared hint text — surfaced identically by both pathways on validation failure
DATE_RANGE_HINT = (
    "departure_date must be on or after arrival_date, and both must fall "
    "within the trip's own date range."
)
