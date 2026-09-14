# Trip Planner — Model Context Protocol (MCP) Server

A Model Context Protocol (MCP) server providing LLMs (such as Google Gemini in Antigravity IDE) seamless read/write context to the Trip Planner REST API.

## Features

- **Resource (`tripplanner://trips`)**: Exposes all trips owned by the authenticated user along with nested stops, formatted concisely for context-window token efficiency.
- **Tool (`add_stop`)**: Allows LLMs to add stops to existing trips, with strict date constraint validation and location fallback logic.
- **Authentication & Resilience**: Single-user JWT refresh-token exchange with automatic token renewal and 401 retry interceptor.
- **Cross-Version Support**: Works with both MCP 1.x (`FastMCP`) and MCP 2.x (`MCPServer`).

---

## Directory Structure

```
mcp_server/
├── pyproject.toml              # Dependencies & package metadata
├── .env.example                # Sample environment configuration
├── .env                        # Local credentials (git-ignored)
├── README.md                   # Documentation & setup guide
├── auth.py                     # One-time login script (obtains refresh token)
├── api_client.py               # httpx client with token refresh & retry interceptor
├── formatting.py               # Serializes trips & stops matching backend schema
├── server.py                   # FastMCP/MCPServer (supports SSE and stdio)
├── mcp_test_client.py          # Real JSON-RPC stdio protocol test client
└── tests/
    ├── conftest.py             # Mocked test fixtures
    ├── test_resource.py        # Resource & serialization unit tests
    └── test_tool.py            # Tool, validation, and retry unit tests
```

---

## Running the Server

### 1. Web / SSE Mode (Default — for React Frontend AI Copilot)
Runs a Starlette HTTP/SSE server on `http://127.0.0.1:8080/sse`:
```bash
python mcp_server/server.py
```

### 2. Terminal / stdio Mode (For Antigravity IDE, Claude Desktop, Cursor)
Runs standard I/O pipes for desktop AI hosts:
```bash
python mcp_server/server.py --transport stdio
# or: set MCP_TRANSPORT=stdio
```

---

## Quick Start

### 1. Install Dependencies

```bash
pip install "mcp>=1.0.0" "httpx>=0.27.0" "python-dotenv>=1.0.0" pytest pytest-asyncio
```

### 2. Obtain Refresh Token

Run the one-time authentication script against your running Django backend:

```bash
python mcp_server/auth.py --username <your_username> --password <your_password> --save-env
```

This saves `TRIP_PLANNER_REFRESH_TOKEN` to `mcp_server/.env`.

### 3. Run Tests

```bash
pytest mcp_server/tests/ -v
```

### 4. Test MCP Protocol Handshake & Tool Calling

```bash
python mcp_server/mcp_test_client.py
```

---

## IDE & Gemini Configuration

### Antigravity IDE / Gemini IDE

Add the server to `~/.gemini/config/mcp_config.json` or `.agents/mcp_config.json`:

```json
{
  "mcpServers": {
    "trip-planner": {
      "command": "python",
      "args": [
        "c:/Users/hp/OneDrive - Higher Education Commission/Documents/TripPlanner/mcp_server/server.py",
        "--transport",
        "stdio"
      ],
      "env": {
        "TRIP_PLANNER_API_BASE_URL": "http://127.0.0.1:8000/api/v1",
        "TRIP_PLANNER_REFRESH_TOKEN": "<your_refresh_token>"
      }
    }
  }
}
```

---

## MCP Schema Reference

### Resource: `tripplanner://trips`
Returns a JSON array of all trips owned by the user, formatted with nested stops:
```json
[
  {
    "id": 1,
    "title": "Summer Trip",
    "description": "Sightseeing",
    "start_date": "2026-08-12",
    "end_date": "2026-09-12",
    "stop_count": 1,
    "stops": [
      {
        "id": 1,
        "name": "Lahore",
        "location": "Lahore",
        "order": 0,
        "arrival_date": "2026-08-19",
        "departure_date": "2026-08-21",
        "stop_type": "visit"
      }
    ]
  }
]
```

### Tool: `add_stop`
- **Parameters:**
  - `trip_id` (int, required): Target trip ID.
  - `name` (str, required): Name of the stop/attraction.
  - `location` (str, optional): Location string or address. If empty, falls back to `city, country` or `name`.
  - `arrival_date` (str, optional): `YYYY-MM-DD`. Must fall within `[trip.start_date, trip.end_date]`.
  - `departure_date` (str, optional): `YYYY-MM-DD`. Must fall within `[trip.start_date, trip.end_date]` and be `>= arrival_date`.
  - `description` (str, optional): Notes about the stop.
  - `city` (str, optional): Fallback for location.
  - `country` (str, optional): Fallback for location.
  - `stop_type` (str, optional): `"visit"` (default) or `"transfer"`.
  - `duration_minutes` (int, optional): Estimated visit duration.
