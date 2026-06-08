# Session State

This file is updated automatically at every checkpoint and stage
completion. If starting a new session, read this file first.

## Current stage
Stage 4 (client-app foundation) -- NOT STARTED

## Last completed
Stage 3.5 complete and merged. ha-core is fully built:
- Stage 1: HA WebSocket client (ws-client.js) -- auth, reconnect, cache
- Stage 2: entity normalisation (entities.js) -- 9 domains, stable contract
- Stage 3: REST API + SSE + Express (api.js, events.js, index.js)
- Stage 3.5: SQLite persistence + B2 backup (db.js, backup.js)
All merged to main (commit 42fa2e7). 65/65 tests pass.

## In progress
Nothing. Branch stage-4-client-app has been cut from main but no code written.

## Next action
Stage 4: client-app foundation.
Files to build in packages/client-app/src/:
- client.config.json reader (already has placeholder at packages/client-app/client.config.json
  with clientName, logoUrl, colours, rooms:[])
- Zustand entity store
- useHA custom hook: SSE consumer at /events (NOT WebSocket), REST commands via
  fetch to ha-core at http://localhost:3001
- PWA manifest + service worker stub
- App shell: dark editorial aesthetic, bottom nav (Rooms, Scenes, Cameras, Settings),
  client logo in header, primary colour from config as CSS variable
- Tailwind CSS dark theme configuration

Test: render app shell with placeholder room list from client.config.json.
MCP: Filesystem only. Model: Sonnet 4.6. Effort: high.

IMPORTANT for new session:
- Read packages/client-app/package.json to check existing deps
- Read packages/client-app/client.config.json for current config shape
- Read packages/client-app/src/ to see existing skeleton files
- ha-core runs on port 3001; client-app dev server on port 5173 (Vite default)
- SSE endpoint is GET http://localhost:3001/events
- REST commands are POST http://localhost:3001/services/:domain/:service

## Open decisions
- client.config.json rooms array is currently empty -- Stage 4 populates it
  with dummy rooms for the test, Stage 11 populates it for real clients
- ha-mcp still needs Claude Code restart to load (not needed until Stage 7)

## Branch state
- main: 42fa2e7 (merge commit, ha-core Stages 1-3.5)
- stage-4-client-app: branched from main, no commits yet
- stage-1-ws-client: old feature branch, can be deleted after this session
- spike: throwaway stage 0 spike branch

## Context reset prompt location
onboarding/staff/CLAUDE_CODE_WORKFLOW.md
