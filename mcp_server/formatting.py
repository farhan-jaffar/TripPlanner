"""Data serialization and formatting utilities for Trip Planner MCP server."""

from __future__ import annotations

import json
from typing import Any


def format_stop(stop: dict[str, Any]) -> dict[str, Any]:
    """Format an individual stop dictionary for LLM consumption.

    Extracts core fields and omits None/empty non-essential fields to optimize token usage.
    """
    formatted: dict[str, Any] = {
        "id": stop.get("id"),
        "name": stop.get("name"),
        "location": stop.get("location"),
        "order": stop.get("order", 0),
    }
    if stop.get("arrival_date"):
        formatted["arrival_date"] = stop["arrival_date"]
    if stop.get("departure_date"):
        formatted["departure_date"] = stop["departure_date"]
    if stop.get("stop_type"):
        formatted["stop_type"] = stop["stop_type"]
    if stop.get("duration_minutes") is not None:
        formatted["duration_minutes"] = stop["duration_minutes"]
    if stop.get("description"):
        formatted["description"] = stop["description"]
    return formatted


def format_trip(trip: dict[str, Any], stops: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Format a trip dictionary with its nested stops.

    Args:
        trip: Raw trip dictionary from Django REST API.
        stops: Optional list of raw stop dictionaries. If not provided,
               looks for a 'stops' key in the trip dict.
    """
    stops_list = stops if stops is not None else trip.get("stops", [])
    formatted_stops = [format_stop(s) for s in stops_list]

    stop_count = (
        len(formatted_stops) if stops is not None else trip.get("stop_count", len(formatted_stops))
    )

    return {
        "id": trip.get("id"),
        "title": trip.get("title"),
        "description": trip.get("description", ""),
        "start_date": trip.get("start_date"),
        "end_date": trip.get("end_date"),
        "stop_count": stop_count,
        "stops": formatted_stops,
    }


def format_trips_for_resource(trips_with_stops: list[dict[str, Any]]) -> str:
    """Serialize a list of formatted trips to a JSON string for the MCP resource."""
    return json.dumps(trips_with_stops, indent=2, ensure_ascii=False)
