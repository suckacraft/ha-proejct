# Progress Log

See also SESSION_STATE.md for quick-start context for new sessions.

## 2026-06-08 — Stage 1: ha-core WebSocket client

**Status:** Complete (branch: stage-1-ws-client, commit 56b8ae8)

**Decisions:**
- Native Node 24 WebSocket (global) -- no `ws` package, same as spike
- Token sourced from `HASS_TOKEN` env var, falls back to config.json placeholder
- Singleton export pattern -- one connection per ha-core process
- `home-assistant-js-websocket` retained as dependency for future stages but
  not used here; native WS gives full control over backoff and event shape
- `"type": "module"` added to ha-core package.json (all src files are ESM)

**What was done:**
- `ws-client.js`: auth handshake, state_changed subscription, get_states cache
  population, exponential backoff reconnect (1s base, 30s cap), EventEmitter
  events, getState/getAllStates/subscribe API
- 4 integration tests in `test/ws-client.test.js`, skip gracefully without token
- CLAUDE.md rules 16 and 17 revised: model and effort are user-typed slash
  commands, not programmatic -- Claude prompts user with exact text to type

**Test evidence:**
- All 4 tests passed against live HA
- 5 state_changed events received in 2.5s
- Cache populated, subscribe API confirmed working

## 2026-06-08 — Stage 0b: End-to-end spike (de-risking)

**Status:** Complete (throwaway, lives on `spike` branch 6b0cc39, not on master)

**Decisions:**
- Node global WebSocket (Node 24, no `ws` dependency needed)
- HA token read at runtime from gitignored `spike/.ha-token`, never committed
- Target entity: `light.bed_light` (HA demo integration), safe to toggle

**What was done:**
- Hardcoded Node http server + WebSocket client; one-button HTML page
- GET /state (WS-cached) and POST /toggle (HA call_service light.toggle)
- Verified end to end: token authenticates, WS connects, real device
  toggled off->on->off, cross-checked against HA /api/states directly
- Not built upon, per spec -- the full path is now proven for Stage 1

## 2026-06-08 — Stage 0: Monorepo Scaffolding

**Status:** Complete

**Decisions:**
- npm workspaces over Yarn/pnpm (npm available, keeps tooling simple)
- Exact pinned versions for all deps (reproducible builds)
- Placeholder source files export empty objects so imports work immediately
- Tailwind CSS 4 + Vite 8 + React 19 (latest stable stack)

**What was done:**
- Initialised git repo and root workspace config
- Created ha-core, client-app, and operator-app package skeletons
- Set up Docker Compose with three services
- Added CLAUDE.md with project rules
