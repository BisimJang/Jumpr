# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Critical Architecture

- Backend runs in **dual mode**: FastAPI server (port 8000) AND MCP server via FastMCP
- [`bob_service.py`](backend/bob_service.py) must be run directly for MCP mode: `python backend/bob_service.py`
- [`main.py`](backend/main.py) runs FastAPI server: `python backend/main.py`
- MCP config at [`.bob/mcp.json`](.bob/mcp.json) uses **absolute paths** - update for different machines

## Non-Standard Patterns

- **In-memory state**: [`BobStorage`](backend/bob_service.py:10) class stores insights without persistence (resets on restart)
- **Polling architecture**: Frontend polls `/live-updates` every 2 seconds instead of WebSockets
- **MCP tools**: [`submit_repository_insights()`](backend/bob_service.py:32) is the MCP tool for pushing data to UI
- **Platform-specific deps**: `python-magic` vs `python-magic-bin` based on OS in [`requirements.txt`](backend/requirements.txt:5-6)

## Setup

- Run [`setup.bat`](setup.bat) to start both services in separate terminal windows
- Backend venv: `backend/.venv` (created automatically)
- Frontend: Standard Vite + React (port 5173)

## Commands

```bash
# Backend (from project root)
cd backend && .venv\Scripts\activate && python main.py

# Frontend (from project root)  
cd frontend && npm run dev

# MCP Server (from project root)
python backend/bob_service.py