# Code Mode Rules (Non-Obvious Only)

## Critical Patterns

- **BobStorage is stateless**: [`BobStorage._latest_insights`](../../backend/bob_service.py:12) is class-level in-memory only - no persistence
- **MCP decorators required**: Use `@mcp.tool()` and `@mcp.prompt()` from FastMCP, not standard decorators
- **Dual server modes**: [`bob_service.py`](../../backend/bob_service.py) runs as MCP server when executed directly, imported as module in FastAPI
- **Absolute paths in MCP config**: [`.bob/mcp.json`](../.bob/mcp.json:8) requires full system paths, not relative

## Backend Conventions

- FastAPI endpoints use `async def` even without await (for consistency)
- MCP tool parameters must match exact names in [`submit_repository_insights()`](../../backend/bob_service.py:32-41)
- No database - all state in [`BobStorage`](../../backend/bob_service.py:10) class variable

## Frontend Conventions

- Polling interval hardcoded at 2000ms in [`App.jsx`](../../frontend/src/App.jsx:26)
- Backend URL hardcoded as `http://localhost:8000` (no env vars)
- State management via React hooks only (no Redux/Context)

## No Access To

- MCP tools
- Browser tools