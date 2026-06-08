# Functionality Tracker

## Stage 4: client-app foundation

- [x] `client.config.json` reader: `loadConfig()` fetches config, sets `--color-primary` CSS var on `:root`
- [x] Zustand entity store: `Map<id, entity>`, `setEntity`, `removeEntity` actions
- [x] `useHA` hook: EventSource `/api/events`, `state_changed` → setEntity/removeEntity, `callService()` POST
- [x] PWA foundation: `vite-plugin-pwa` with manifest, `@tailwindcss/vite` v4 migration, Vite proxy `/api` → port 3001
- [x] App shell: dark editorial aesthetic, Barlow Condensed + DM Sans, CSS var white-label theming
- [x] Header: client name + logo from config
- [x] Bottom nav: Rooms / Scenes / Cameras / Settings tab state
- [x] RoomList: 2-col grid, room cards with entity count numeral
- [x] ha-core: `wireEvents` exported + normalises `new_state` before SSE broadcast; internal entities filtered
- [x] 13 client-app unit tests pass; 68 ha-core tests pass (81 total)
- [x] PostCSS fix: `postcss.config.js` deleted (conflicts with `@tailwindcss/vite`)
- [x] Browser confirmed working
- Branch: `stage-4-client-app`, HEAD 143a340

## Stage 0: Project Scaffolding

- [x] Monorepo structure with npm workspaces
- [x] ha-core package skeleton (Express + HA WebSocket adapter)
- [x] client-app package skeleton (React + Vite + Tailwind PWA)
- [x] operator-app package skeleton (React + Vite + Tailwind dashboard)
- [x] Docker Compose configuration
- [x] Development tooling (Prettier, Vitest, Nodemon)

## Stage 3.5: ha-core persistence and backup

- [x] SQLite schema: `site_events` (connection, backup events) + `device_history` (sampled state)
- [x] Availability transitions always recorded; other changes throttled to 5-min windows
- [x] `ha_connected` / `ha_disconnected` events auto-recorded on WS events
- [x] `device_history` populated from `state_changed` stream
- [x] 90-day pruning on startup + nightly 03:00 cron
- [x] `GET /history/events?since=`, `/history/uptime`, `/history/device/:id`, `/history/backups`
- [x] `POST /backup/run`: triggers HA `backup.create`, uploads to Backblaze B2 (S3-compatible), records result
- [x] B2 upload skips gracefully when credentials absent; SOPS injection point documented for Stage 11
- [x] Nightly backup cron at 02:00
- [x] 18 DB unit tests with in-memory SQLite (isolated per test via `setDb()`)
- Branch: `stage-1-ws-client` (commit 276b91f)

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
