"""Model Context Protocol (MCP) Server for Trip Planner.

Provides:
- Resource: tripplanner://trips (read-only trips with nested stops)
- Tool: add_stop (add a stop to an existing trip)
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

# Ensure project root is on sys.path when executed directly
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

try:
    from mcp.server.fastmcp import FastMCP
except (ImportError, ModuleNotFoundError):
    from mcp.server.mcpserver import MCPServer as FastMCP  # noqa: E402


from mcp_server.api_client import (  # noqa: E402
    AuthenticationError,
    ResourceNotFoundError,
    TripPlannerAPIError,
    ValidationError,
    default_client,
)
from mcp_server.formatting import format_stop, format_trips_for_resource  # noqa: E402
from trips.ai.stop_tool_spec import (  # noqa: E402
    DATE_RANGE_HINT,
    STOP_TOOL_DESCRIPTION,
    STOP_TOOL_NAME,
)

# Initialize FastMCP Server instance
mcp = FastMCP("TripPlanner")


@mcp.resource("tripplanner://trips")
async def trips_resource() -> str:
    """All trips owned by the authenticated user with their nested stops.

    Returns a JSON string listing each trip with:
    - id: Unique integer ID of the trip
    - title: Trip title
    - description: Trip overview or notes
    - start_date: Trip start date (YYYY-MM-DD)
    - end_date: Trip end date (YYYY-MM-DD)
    - stop_count: Total number of stops
    - stops: List of stops containing id, name, location, dates, and order
    """
    try:
        trips = await default_client.get_all_trips_with_stops()
        return format_trips_for_resource(trips)
    except AuthenticationError as exc:
        return json.dumps(
            {
                "error": "Authentication failed",
                "details": str(exc),
                "help": (
                    "Please set TRIP_PLANNER_REFRESH_TOKEN in your environment "
                    "or run `python mcp_server/auth.py`."
                ),
            },
            indent=2,
        )
    except TripPlannerAPIError as exc:
        return json.dumps({"error": f"Trip Planner API error: {exc}"}, indent=2)
    except Exception as exc:
        return json.dumps({"error": f"Unexpected error: {exc}"}, indent=2)


@mcp.tool(name=STOP_TOOL_NAME, description=STOP_TOOL_DESCRIPTION)
async def add_stop(
    trip_id: int,
    name: str,
    arrival_date: str | None = None,
    departure_date: str | None = None,
    location: str = "",
    city: str = "",
    country: str = "",
    description: str = "",
    stop_type: str = "visit",
    duration_minutes: int | None = None,
    auth_token: str | None = None,
) -> str:
    """Add a stop to one of the user's trips.

    Dates must be ISO format (YYYY-MM-DD) and departure_date must be >= arrival_date.
    """
    # Defensive resolution of required location field
    fallback_parts = [part.strip() for part in (city, country) if part and part.strip()]
    fallback_location = ", ".join(fallback_parts)
    effective_location = location.strip() or fallback_location or name.strip()

    payload: dict[str, Any] = {
        "name": name.strip(),
        "location": effective_location,
        "description": description.strip() if description else "",
        "stop_type": stop_type if stop_type in ("visit", "transfer") else "visit",
    }

    if arrival_date and arrival_date.strip():
        payload["arrival_date"] = arrival_date.strip()
    if departure_date and departure_date.strip():
        payload["departure_date"] = departure_date.strip()
    if duration_minutes is not None and duration_minutes > 0:
        payload["duration_minutes"] = duration_minutes

    try:
        if auth_token:
            created = await default_client.create_stop(trip_id, payload, auth_token=auth_token)
        else:
            created = await default_client.create_stop(trip_id, payload)
        return json.dumps(
            {
                "status": "success",
                "message": f"Successfully added stop '{created.get('name')}' to trip {trip_id}.",
                "stop": format_stop(created),
            },
            indent=2,
        )
    except ResourceNotFoundError:
        return json.dumps(
            {
                "status": "error",
                "error_type": "not_found",
                "message": (
                    f"Trip with ID {trip_id} was not found or is not owned by your account. "
                    "Use the 'tripplanner://trips' resource to find available trip IDs."
                ),
            },
            indent=2,
        )
    except ValidationError as exc:
        return json.dumps(
            {
                "status": "error",
                "error_type": "validation_error",
                "message": str(exc),
                "details": exc.details,
                "hint": f"Strict date constraints: {DATE_RANGE_HINT}",
            },
            indent=2,
        )
    except AuthenticationError as exc:
        return json.dumps(
            {
                "status": "error",
                "error_type": "authentication_error",
                "message": str(exc),
                "hint": "Check your TRIP_PLANNER_REFRESH_TOKEN configuration.",
            },
            indent=2,
        )
    except TripPlannerAPIError as exc:
        return json.dumps(
            {
                "status": "error",
                "error_type": "api_error",
                "message": f"Trip Planner API request failed: {exc}",
            },
            indent=2,
        )
    except Exception as exc:
        return json.dumps(
            {
                "status": "error",
                "error_type": "unexpected_error",
                "message": f"Unexpected error while adding stop: {exc}",
            },
            indent=2,
        )


add_stop.__doc__ = STOP_TOOL_DESCRIPTION


def main() -> None:
    """Run the MCP server over stdio by default (for Antigravity/Claude), or SSE (port 8001)."""
    transport = os.environ.get("MCP_TRANSPORT", "").lower()
    if len(sys.argv) > 1 and sys.argv[1].startswith("--transport="):
        transport = sys.argv[1].split("=")[1].lower()
    elif len(sys.argv) > 2 and sys.argv[1] == "--transport":
        transport = sys.argv[2].lower()

    if transport == "sse":
        port = int(os.environ.get("MCP_PORT", 8001))
        host = os.environ.get("MCP_HOST", "127.0.0.1")
        mcp.run(transport="sse", host=host, port=port)
    else:
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
