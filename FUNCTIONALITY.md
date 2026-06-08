# Functionality Tracker

## Stage 0: Project Scaffolding

- [x] Monorepo structure with npm workspaces
- [x] ha-core package skeleton (Express + HA WebSocket adapter)
- [x] client-app package skeleton (React + Vite + Tailwind PWA)
- [x] operator-app package skeleton (React + Vite + Tailwind dashboard)
- [x] Docker Compose configuration
- [x] Development tooling (Prettier, Vitest, Nodemon)

## Stage 3: ha-core REST API and Express server

- [x] Express server on port 3001 (`index.js`)
- [x] `GET /entities` -- all 118 normalised entities
- [x] `GET /entities/:domain` -- filter by domain (no dot in param)
- [x] `GET /entities/:entityId` -- single entity (dot in param)
- [x] `GET /rooms` and `GET /rooms/:roomId/entities` -- from client.config.json
- [x] `POST /services/:domain/:service` -- calls HA via ws-client.callService
- [x] `POST /scenes/:sceneId` -- calls scene.turn_on (accepts "movie_night" or "scene.movie_night")
- [x] `GET /events` -- SSE endpoint; 30s heartbeat; broadcasts normalised state_changed
- [x] `GET /health` -- connected status, entity count, SSE client count, uptime
- [x] CORS, Helmet, Morgan middleware
- [x] ws-client extended: callService (Promise, 10s timeout), connected getter
- [x] createRouter() injectable deps -- 15 unit tests with stub ws-client, no live HA needed
- Branch: `stage-1-ws-client` (commit e0b4f98)

## Stage 2: ha-core entity normalisation

- [x] `entities.js` normalises raw HA entities into `{ id, domain, name, state, attributes, lastChanged }`
- [x] Curated camelCase attribute contracts for 9 product domains (light, switch, sensor, binary_sensor, climate, camera, lock, media_player, scene)
- [x] Passthrough for all other domains (38 total in live HA) for forward compatibility
- [x] `brightnessPct` (0-100) exposed instead of HA's raw 0-255 `brightness`
- [x] HA naming quirks absorbed: `temperature` -> `targetTemperature`, `humidity` -> `targetHumidity`
- [x] Internal entity filter (group./automation./script.) with whitelist override
- [x] `normaliseEntity`, `normaliseEntities`, `getEntitiesByDomain`, `getEntitiesByRoom`
- [x] 32 fixture-based regression tests (real HA shapes, sanitised tokens) all pass
- [x] Live integration test: 118 entities normalised across 38 domains, zero internal leakage
- Branch: `stage-1-ws-client` (commit 3c472e2)

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
