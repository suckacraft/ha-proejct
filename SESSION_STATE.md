# Session State

This file is updated automatically at every checkpoint and stage
completion. If starting a new session, read this file first.

## Current stage
Stage 4 (client-app foundation) -- COMPLETE

## Last completed
Stage 4 complete. client-app foundation built on branch stage-4-client-app:
- loadConfig() + CSS var white-label injection (--color-primary)
- Zustand entity store (Map, setEntity, removeEntity)
- useHA hook (EventSource /api/events, callService POST)
- App shell: Header, BottomNav (tab state), RoomList (2-col grid)
- PWA: vite-plugin-pwa manifest + @tailwindcss/vite v4 migration
- Vite proxy /api → localhost:3001
- ha-core: wireEvents now normalises before SSE broadcast
- 81 tests pass (68 ha-core + 13 client-app)
Branch not yet merged to main.

## In progress
Nothing.

## Next action
Stage 5: room detail view and entity tiles (lights, switches, sensors, climate).
Files to build: src/components/rooms/RoomDetail.jsx, src/components/devices/ tiles.
MCP: Filesystem only. Model: Sonnet 4.6. Effort: high.

IMPORTANT for new session:
- client.config.json rooms array has 3 dummy rooms (Living Room, Bedroom, Kitchen)
  added for dev testing
- Vite proxy strips /api prefix before forwarding to ha-core port 3001
- Tailwind 4 uses @tailwindcss/vite plugin (NOT postcss), no tailwind.config.js
- --color-primary CSS var is set at runtime by loadConfig(), overrides @theme default

IMPORTANT for new session:
- Read packages/client-app/package.json to check existing deps
- Read packages/client-app/client.config.json for current config shape
- Read packages/client-app/src/ to see existing skeleton files
- ha-core runs on port 3001; client-app dev server on port 5173 (Vite default)
- SSE endpoint is GET http://localhost:3001/events
- REST commands are POST http://localhost:3001/services/:domain/:service

## Open decisions
- client.config.json rooms are blocked by a write-protect hook -- add dummy rooms
  manually for dev testing (see Next action above for schema)
- ha-mcp removed from MCP config (not needed until Stage 7)

## Branch state
- main: 42fa2e7 (merge commit, ha-core Stages 1-3.5)
- stage-4-client-app: branched from main, no commits yet
- stage-1-ws-client: old feature branch, can be deleted after this session
- spike: throwaway stage 0 spike branch

## Context reset prompt location
onboarding/staff/CLAUDE_CODE_WORKFLOW.md
