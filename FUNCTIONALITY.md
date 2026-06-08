# Functionality Tracker

## Stage 0: Project Scaffolding

- [x] Monorepo structure with npm workspaces
- [x] ha-core package skeleton (Express + HA WebSocket adapter)
- [x] client-app package skeleton (React + Vite + Tailwind PWA)
- [x] operator-app package skeleton (React + Vite + Tailwind dashboard)
- [x] Docker Compose configuration
- [x] Development tooling (Prettier, Vitest, Nodemon)

## Stage 1: ha-core WebSocket client

- [x] `ws-client.js` connects and authenticates to HA WebSocket API
- [x] Exponential backoff reconnection (1s base, 30s cap)
- [x] Emits: `connected`, `disconnected`, `state_changed`, `error`
- [x] Subscribes to `state_changed` events on connect
- [x] Populates entity cache from `get_states` on auth
- [x] `getState(entityId)`, `getAllStates()`, `subscribe(entityId, callback)`
- [x] 4 integration tests pass against live HA (5 events in 2.5s)
- Branch: `stage-1-ws-client` (commit 56b8ae8)

## Stage 0b: End-to-end spike (validated, throwaway)

- [x] HA WebSocket authentication + connection proven against live HA
- [x] Service call toggles a real light (`light.bed_light`)
- [x] `state_changed` round-trips back to the browser via GET /state
- Note: lives on the `spike` branch only (6b0cc39); deliberately not part
  of the built system. Confirms the path before Stage 1 builds ha-core properly.
