# Functionality Tracker

## Pre-Stage 6: UI polish + home screen + colour sheet

- [x] `HomeScreen`: `/home` as default app entry point — greeting (time-of-day + firstName), weather widget (HA `weather.*` entity), active summary pills (lights on count, temperature sensor, unlocked locks), favourite rooms horizontal scroll (default first 3 from config, or `homeFavourites` pref), quick scenes pill buttons (1.5s flash feedback, calls `scene.turn_on`), now playing section (media_player in "playing" state)
- [x] `BottomNav`: 5 tabs with filled SVG icons — Home (house), Rooms (grid), Scenes (star), Cameras (camera), Settings (gear)
- [x] `useClock` hook: `new Date()` updated every 60s via `setInterval`
- [x] `homeFavourites` in preferences store: `null` = show first 3 rooms; array of room IDs otherwise; persisted via `savePreference("home_favourites", ...)`
- [x] Shared `Header` hidden on `/home` route; HomeScreen owns its own header row
- [x] `LightTile` full colour control: `resolveMode()` returns onoff/brightness/color_temp/hs/combo; card-as-drag-brightness with warm radial glow (0.55 alpha, scales with `brightnessPct`); colour bottom sheet (75svh, spring animation, primary-tint top border)
- [x] Bottom sheet contents: temperature strip (warm→cool gradient, 32px track), swatch sections (Saved horizontal row with 48px circles + names, Colours 3×3 grid), custom H/S picker
- [x] Active swatch: scale(1.1) + white ring box-shadow + 0.6 opacity on inactive + checkmark overlay SVG
- [x] Tap ripple: scale(0.92) flash on swatch press via `flashKey` state
- [x] Inline name input for saving favourites: button → input field (pre-filled, Enter/Escape, max 6 favourites total)
- [x] Long-press 500ms context menu: action sheet at bottom of colour sheet with Rename and Delete options
- [x] Inline rename: replaces swatch name label with text input; on confirm calls `onRemoveFavourite` + `onAddFavourite`
- [x] Floating kelvin label: appears above temp slider thumb while dragging, disappears 1s after release
- [x] X close button: top-right of sheet panel (aria-label="Close")
- [x] Swipe-to-dismiss guard: handle drag only dismisses when `sheetScrollRef.scrollTop === 0`
- [x] Optimistic colour preview: swatch tap immediately updates tile colour circle via local state; clears after 5s
- [x] LightTile onoff card: centred power icon + name + ON/OFF text; primary-20% tint when on
- [x] LightTile colour card: power icon top-right, colour circle bottom-left, brightness badge bottom-right
- [x] `SensorTile`: 32px Barlow value, 11px muted caps name, `min-h-[160px]`
- [x] `ClimateTile`: current°→target° inline with arrow, colour-coded pill badges (orange/blue/grey), ±44px full-width buttons
- [x] `SkeletonTile`: `min-h-[160px]`, `rounded-2xl` (was `h-24 rounded-xl`)
- [x] `RoomDetail`: `flex flex-col gap-3`, 13px muted caps heading, `h-px` divider after heading
- [x] ha-core preferences API: `preferences(site_id, key, value, updated_at)` SQLite table; `GET /preferences`, `GET /preferences/:key`, `POST /preferences/:key`; UPSERT on conflict; value is JSON text
- [x] `usePreferencesStore`: `hydrate()` seeds from `/api/preferences`; `addFavourite`/`removeFavourite`; `saveRoomDefault`/`clearRoomDefault`; `setHomeFavourites`
- [x] Room default brightness: slider in RoomDetail, Apply button calls `callService` for each light in room, clear button removes default
- [x] 119 client-app unit tests; 84 ha-core tests (203 total)
- Branch: `stage-5-room-detail`, HEAD `029f02f`

## Stage 5: room detail + entity tiles

- [x] `react-router-dom` 7.17.0: URL-based navigation replacing useState tabs
- [x] `BrowserRouter` + `AppContent` inner component — `useLocation`/`useNavigate` inside Router
- [x] `BottomNav`: `NavLink`-based, active state via router; Rooms tab stays lit on sub-routes
- [x] `RoomList`: room cards wrapped in `<Link to="/rooms/:id">`
- [x] `Header`: optional `onBack` prop — back arrow appears on `/rooms/:id` routes
- [x] `RoomDetail`: `useParams` for roomId, dispatches entities to tiles via `TILE_MAP` registry
- [x] `TILE_MAP` registry: `{ light, switch, sensor, binary_sensor, climate }` — one-line extension point
- [x] `SkeletonTile`: `animate-pulse` placeholder for entities not yet in store
- [x] `FallbackTile`: read-only name + state for unrecognised domains (lock, media_player, etc.)
- [x] `LightTile`: toggle on/off + brightness slider (when `brightnessPct !== null`)
- [x] `SwitchTile`: toggle on/off
- [x] `SensorTile`: name + value + unit (read-only); also handles `binary_sensor`
- [x] `ClimateTile`: current temp, target temp, ±1° buttons → `climate.set_temperature`; HVAC mode badge; float-step safe
- [x] `callService`: standalone async function in `src/lib/`; throws on non-ok responses
- [x] `useHA`: simplified to SSE-only; `callService` extracted; URL contract pinned in tests
- [x] `useHA`: seeds Zustand store from `GET /api/entities` snapshot on mount; SSE delivers incremental updates from that point
- [x] SSE real-time sync confirmed: toggles update tiles within 2 seconds, HA→app and app→HA two-way sync without refresh
- [x] 55 client-app unit tests pass; 68 ha-core tests pass (123 total)
- Branch: `stage-5-room-detail`

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
