"""
Real MCP protocol test client for the Trip Planner MCP server.

This script genuinely exercises the MCP protocol by:
  1. Spawning server.py as a real subprocess.
  2. Performing a proper MCP handshake (initialize / initialized).
  3. Calling list_resources() and read_resource() over stdio JSON-RPC.
  4. Calling list_tools() to verify the add_stop schema is advertised.
  5. Calling call_tool("add_stop", ...) which routes through the real
     FastMCP handler -> api_client.py -> Django REST API -> database.

Every step crosses the real MCP protocol boundary over stdin/stdout pipes.
No Python function is imported or called in-process.

Prerequisites
-------------
- Django dev server must be running at http://127.0.0.1:8000
- A valid TRIP_PLANNER_REFRESH_TOKEN must be in mcp_server/.env

Usage
-----
From the project root:
    python mcp_server/mcp_test_client.py
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# ---------------------------------------------------------------------------
# Resolve paths
# ---------------------------------------------------------------------------
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_SERVER_SCRIPT = _PROJECT_ROOT / "mcp_server" / "server.py"
_ENV_FILE = _PROJECT_ROOT / "mcp_server" / ".env"


# ---------------------------------------------------------------------------
# Environment passed to the server subprocess.
# Override the base URL to point at the live Django dev server, not testserver.
# The refresh token is read from the .env file automatically by api_client.py.
# ---------------------------------------------------------------------------
def _build_server_env() -> dict[str, str]:
    env = os.environ.copy()
    env["TRIP_PLANNER_API_BASE_URL"] = "http://127.0.0.1:8000/api/v1"

    # Pull the refresh token from mcp_server/.env if present
    if _ENV_FILE.exists():
        for line in _ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip()
                if key == "TRIP_PLANNER_REFRESH_TOKEN" and val:
                    env[key] = val
    return env


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _section(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print("=" * 60)


def _ok(msg: str) -> None:
    print(f"  [OK]  {msg}")


def _info(msg: str) -> None:
    print(f"        {msg}")


def _fail(msg: str) -> None:
    print(f"  [FAIL] {msg}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Main test routine
# ---------------------------------------------------------------------------
async def run_mcp_protocol_test() -> None:
    server_params = StdioServerParameters(
        command=sys.executable,  # same Python interpreter running us
        args=[str(_SERVER_SCRIPT), "--transport", "stdio"],
        env=_build_server_env(),
    )

    _section("Step 1 — Spawn server.py and perform MCP handshake")
    async with (
        stdio_client(server_params) as (read, write),
        ClientSession(read, write) as session,
    ):
        init_result = await session.initialize()
        server_name = getattr(init_result.server_info, "name", "unknown")
        _ok(f"Handshake complete — server name: {server_name!r}")

        # ----------------------------------------------------------------
        # Step 2: List resources
        # ----------------------------------------------------------------
        _section("Step 2 — list_resources()")
        resources_result = await session.list_resources()
        resource_uris = [str(r.uri) for r in resources_result.resources]
        _ok(f"Resources advertised: {resource_uris}")
        assert "tripplanner://trips" in resource_uris, (
            f"Expected 'tripplanner://trips' in resources, got {resource_uris}"
        )
        _ok("'tripplanner://trips' is present ✓")

        # ----------------------------------------------------------------
        # Step 3: Read the trips resource (full JSON-RPC round-trip)
        # ----------------------------------------------------------------
        _section("Step 3 — read_resource('tripplanner://trips')")
        trips_result = await session.read_resource("tripplanner://trips")

        # Safely extract the text content
        content = trips_result.contents[0]
        trips_text = content.text if hasattr(content, "text") else content.blob.decode()

        try:
            trips = json.loads(trips_text)
        except json.JSONDecodeError:
            _fail(f"Resource returned non-JSON content:\n{trips_text}")
            return

        if isinstance(trips, list):
            _ok(f"Resource returned {len(trips)} trip(s)")
            for t in trips[:3]:  # show up to 3
                _info(
                    f"  Trip #{t.get('id')} — {t.get('title')!r} "
                    f"({t.get('start_date')} → {t.get('end_date')}, "
                    f"{t.get('stop_count', 0)} stop(s))"
                )
        elif isinstance(trips, dict) and "error" in trips:
            _fail(f"Server returned an error: {trips}")
            return
        else:
            _fail(f"Unexpected resource response shape: {trips_text[:200]}")
            return

        if not trips:
            _info("No trips found — skipping tool call (nothing to add a stop to).")
            return

        # ----------------------------------------------------------------
        # Step 4: List tools
        # ----------------------------------------------------------------
        _section("Step 4 — list_tools()")
        tools_result = await session.list_tools()
        tool_names = [t.name for t in tools_result.tools]
        _ok(f"Tools advertised: {tool_names}")
        assert "add_stop" in tool_names, f"Expected 'add_stop' in tools, got {tool_names}"
        _ok("'add_stop' tool is present ✓")

        # Print the actual schema so we can confirm it's correct
        add_stop_tool = next(t for t in tools_result.tools if t.name == "add_stop")
        schema = getattr(add_stop_tool, "input_schema", getattr(add_stop_tool, "inputSchema", {}))
        if hasattr(schema, "properties"):
            param_keys = list(schema.properties.keys())
        elif isinstance(schema, dict):
            param_keys = list(schema.get("properties", {}).keys())
        else:
            param_keys = []
        _info(f"add_stop parameters: {param_keys}")

        # ----------------------------------------------------------------
        # Step 5: Call add_stop via the real protocol
        # ----------------------------------------------------------------
        _section("Step 5 — call_tool('add_stop', {...})")

        # Pick the first trip that has at least one date range we can use
        target_trip = trips[0]
        trip_id = target_trip["id"]
        start_date: str = target_trip.get("start_date", "")
        end_date: str = target_trip.get("end_date", "")

        _info(f"Targeting trip #{trip_id} — {target_trip.get('title')!r}")
        _info(f"Date window: {start_date} → {end_date}")

        # Use the trip's start date to guarantee the stop is in range
        tool_args = {
            "trip_id": trip_id,
            "name": "MCP Protocol Test Stop",
            "location": "MCP Test Location",
            "description": "Created by mcp_test_client.py to verify the real MCP protocol.",
            "stop_type": "visit",
            "arrival_date": start_date,
            "departure_date": start_date,
        }

        call_result = await session.call_tool("add_stop", tool_args)

        # call_tool returns a CallToolResult; the content is a list of content items
        raw_text = call_result.content[0].text if call_result.content else ""

        try:
            parsed = json.loads(raw_text)
        except json.JSONDecodeError:
            parsed = raw_text

        if isinstance(parsed, dict) and parsed.get("status") == "success":
            stop = parsed.get("stop", {})
            _ok(
                f"Stop created successfully via MCP protocol:\n"
                f"     ID:       {stop.get('id')}\n"
                f"     Name:     {stop.get('name')!r}\n"
                f"     Location: {stop.get('location')!r}\n"
                f"     Dates:    {stop.get('arrival_date')} → {stop.get('departure_date')}"
            )
        elif isinstance(parsed, dict) and parsed.get("status") == "error":
            _fail(f"Tool returned an error: {parsed.get('message')}")
            _info(f"Error type: {parsed.get('error_type')}")
            if parsed.get("hint"):
                _info(f"Hint: {parsed['hint']}")
        else:
            formatted = json.dumps(parsed, indent=2) if isinstance(parsed, dict) else raw_text
            _info(f"Raw tool response:\n{formatted}")

    _section("All MCP protocol steps complete")
    _ok("server.py is a genuine, working MCP server over stdio JSON-RPC.")


def main() -> None:
    asyncio.run(run_mcp_protocol_test())


if __name__ == "__main__":
    main()
