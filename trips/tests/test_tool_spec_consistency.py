"""Contract tests ensuring the MCP server implements the canonical stop tool specification."""

from __future__ import annotations

import inspect

from mcp_server.server import add_stop
from trips.ai.stop_tool_spec import (
    DATE_RANGE_HINT,
    STOP_TOOL_DESCRIPTION,
    STOP_TOOL_NAME,
    STOP_TOOL_REQUIRED,
    StopToolArgs,
)


def test_mcp_add_stop_uses_shared_required_fields():
    """Verify add_stop (MCP) declares canonical required fields."""
    params = inspect.signature(add_stop).parameters
    for required_field in STOP_TOOL_REQUIRED:
        assert required_field in params, (
            f"add_stop is missing required field '{required_field}' from the canonical tool spec"
        )


def test_mcp_add_stop_shares_docstring_description():
    """Verify add_stop (MCP) uses the canonical STOP_TOOL_DESCRIPTION."""
    assert add_stop.__doc__ == STOP_TOOL_DESCRIPTION


def test_shared_spec_contract_properties():
    """Verify constants, hints, and typed dict contract in stop_tool_spec."""
    assert STOP_TOOL_NAME == "add_stop"
    assert "departure_date" in STOP_TOOL_DESCRIPTION
    assert "arrival_date" in DATE_RANGE_HINT
    for field in STOP_TOOL_REQUIRED:
        assert field in StopToolArgs.__annotations__, (
            f"StopToolArgs TypedDict is missing required field '{field}'"
        )
