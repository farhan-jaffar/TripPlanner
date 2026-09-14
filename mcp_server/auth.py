"""One-time authentication script to obtain a refresh token for Trip Planner MCP server."""

from __future__ import annotations

import argparse
import getpass
import os
import sys
from pathlib import Path

import httpx

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))


def login(base_url: str, username: str, password: str) -> dict:
    """Send login request to /auth/token/ endpoint and return token dict."""
    token_url = f"{base_url.rstrip('/')}/auth/token/"
    try:
        response = httpx.post(
            token_url,
            json={"username": username, "password": password},
            timeout=10.0,
        )
    except httpx.RequestError as exc:
        print(
            f"\n[ERROR] Failed to connect to Trip Planner API at {token_url}: {exc}",
            file=sys.stderr,
        )
        sys.exit(1)

    if response.status_code != 200:
        print(
            f"\n[ERROR] Authentication failed (status {response.status_code}): {response.text}",
            file=sys.stderr,
        )
        sys.exit(1)

    return response.json()


def main() -> None:
    parser = argparse.ArgumentParser(description="Trip Planner MCP Server — Obtain Refresh Token")
    parser.add_argument(
        "--base-url",
        default=os.getenv("TRIP_PLANNER_API_BASE_URL", "http://127.0.0.1:8000/api/v1"),
        help="Trip Planner API base URL (default: http://127.0.0.1:8000/api/v1)",
    )
    parser.add_argument("--username", help="Username for Trip Planner account")
    parser.add_argument("--password", help="Password for Trip Planner account")
    parser.add_argument(
        "--save-env",
        action="store_true",
        help="Automatically save the refresh token to mcp_server/.env",
    )

    args = parser.parse_args()

    username = args.username
    if not username:
        username = input("Username: ").strip()

    password = args.password
    if not password:
        password = getpass.getpass("Password: ").strip()

    print(f"\nAuthenticating with {args.base_url}...")
    data = login(args.base_url, username, password)

    refresh_token = data.get("refresh")

    if not refresh_token:
        print("[ERROR] Response did not contain a refresh token.", file=sys.stderr)
        sys.exit(1)

    print("\n" + "=" * 60)
    print("Authentication Successful!")
    print("=" * 60)
    print(f"\nREFRESH TOKEN:\n{refresh_token}\n")
    print("=" * 60)
    print("\nNext steps to configure the MCP server:")
    print("1. Set TRIP_PLANNER_REFRESH_TOKEN in your environment or mcp_server/.env:")
    print(f"   TRIP_PLANNER_API_BASE_URL={args.base_url}")
    print(f"   TRIP_PLANNER_REFRESH_TOKEN={refresh_token}")
    print("\n2. Or configure in ~/.gemini/config/mcp_config.json:")
    print('   "trip-planner": {')
    print('     "command": "python",')
    print('     "args": ["<path_to_project>/mcp_server/server.py"],')
    print('     "env": {')
    print(f'       "TRIP_PLANNER_API_BASE_URL": "{args.base_url}",')
    print(f'       "TRIP_PLANNER_REFRESH_TOKEN": "{refresh_token}"')
    print("     }")
    print("   }")

    if args.save_env:
        env_path = Path(__file__).parent / ".env"
        env_content = (
            f"TRIP_PLANNER_API_BASE_URL={args.base_url}\n"
            f"TRIP_PLANNER_REFRESH_TOKEN={refresh_token}\n"
        )
        env_path.write_text(env_content, encoding="utf-8")
        print(f"\n[OK] Saved token to {env_path}")

        # Also sync mcp_config.json
        from mcp_server.api_client import _update_config_files

        _update_config_files(refresh_token)
        print("[OK] Synchronized refresh token with mcp_config.json")


if __name__ == "__main__":
    main()
