# Progress Log

See also SESSION_STATE.md for quick-start context for new sessions.

## 2026-06-08 — Stage 5: room detail + entity tiles

**Status:** Complete (branch: stage-5-room-detail)

**Decisions:**
- react-router-dom 7.17.0 (exact pin); BrowserRouter wraps App; AppContent is an inner
  component so useLocation/useNavigate can be called inside the Router tree
- Tab navigation: NavLink with isActive class function; Rooms tab active on both
  /rooms and /rooms/:id (no `end` prop) — intentional, keeps the tab lit in context
- callService extracted from useHA into src/lib/callService.js — it has no React
  state dependency so a hook wrapper was unnecessary; tiles import it directly, no
  prop drilling needed (satisfies Rule 5)
- useHA simplified to SSE-only; hook no longer returns anything
- Tile dispatch via TILE_MAP registry object — adding a new tile type is a one-line
  change to devices/index.js, no switch/if-else to maintain
- binary_sensor routed to SensorTile (read-only value display); no dedicated tile needed
- SkeletonTile (animate-pulse) shown when entityId is in room config but entity not
  yet in Zustand store — avoids blank tiles during initial SSE population
- callService throws on non-ok HTTP responses — tiles fire-and-forget but errors
  surface as unhandled rejections (observable in console) rather than silent failures
- ClimateTile temperature unit uses ° without C/F — climate normalizer does not expose
  unit_of_measurement; full unit support deferred to when ha-core adds it
- ClimateTile uses Math.round((base + delta * step) * 10) / 10 to avoid float drift
  on 0.5° steps
- RoomList and RoomDetail default rooms prop to [] — guards against malformed config

**Deferred:**
- Site ID in API calls (Rule 4) — ha-core has no siteId middleware; Stage 6.5 (auth)
- SSE error handler / reconnect — Stage 6 (needs disconnect UI state too)
- LightTile/SwitchTile toggle DRY extraction — only 2 callers; CLAUDE.md Rule against
  premature abstraction; revisit when a 3rd tile type needs the same pattern

**Test evidence:**
- 53/53 client-app unit tests pass (11 test files; 40 new tests across 7 new files)
- 68/68 ha-core tests pass (unchanged)
- 121 total tests across workspace

## 2026-06-08 — Stage 4: client-app foundation

**Status:** Complete (branch: stage-4-client-app)

**Decisions:**
- Tailwind v4 requires `@tailwindcss/vite` plugin, not PostCSS -- JS config file
  deleted, `@import "tailwindcss"` + `@theme {}` replaces `@tailwind` directives
- White-label primary colour injected at runtime via `document.documentElement.style
  .setProperty('--color-primary', ...)` after loadConfig(); @theme provides the
  compile-time fallback only
- ha-core `wireEvents` refactored to accept (client, sse) params and now normalises
  `new_state` before broadcast -- SSE clients always receive the internal envelope,
  never raw HA attributes
- Tab state (useState) chosen over react-router for Stage 4 shell -- router deferred
  to Stage 5 when room detail views need real URLs
- vite-plugin-pwa 1.3.0 added now; icons and offline/caching strategy deferred to
  Stage 11 provisioning; `GenerateSW` mode with note to migrate to `InjectManifest`
- Vite proxy strips `/api` prefix: client calls `/api/entities`, proxy forwards to
  `http://localhost:3001/entities` -- same URL shape in Docker and local dev
- Zustand store holds entities as `Map<id, entity>`; config is module-level (not
  reactive) since it is read-once at startup
- client.config.json blocked by write-protect hook -- dummy rooms must be added
  manually before running the dev server
- postcss.config.js deleted: when present, Vite's PostCSS pipeline intercepts
  `@import "tailwindcss"` before `@tailwindcss/vite` can handle it, triggering
  Tailwind's guard error -- fix is to have no postcss.config.js at all

**Test evidence:**
- 13/13 client-app unit tests pass (config, store, useHA, App shell render)
- 68/68 ha-core tests pass (3 new SSE normalisation tests + 65 existing)
- 81 total tests across workspace

## 2026-06-08 — Stage 3.5: ha-core persistence and backup

**Status:** Complete (branch: stage-1-ws-client, commit 276b91f)

**Decisions:**
- device_history sampling: availability transitions always written (safety-relevant),
  other changes throttled to 5-min windows to avoid DB bloat on chatty sensors
- B2 upload uses @aws-sdk/client-s3 against B2's S3-compatible endpoint (not the
  B2 native SDK) -- fewer moving parts, easier to swap storage providers later
- SOPS encryption of backup files deferred to Stage 11 provisioning (age key
  not available until a site is actually provisioned)
- Camera clip sync deferred to after Stage 7 (Frigate integration not yet built)
- setDb() injection pattern for tests -- no temp files, no filesystem I/O in tests
- node-cron 4.2.1 (latest), @aws-sdk/client-s3 3.1063.0 (latest) -- exact pins

**Test evidence:**
- 65/65 unit tests pass (18 new DB tests)
- Live: /backup/run -> haSnapshot:true (HA backup actually created),
  b2Skipped:true (no creds), backup_completed event confirmed in site_events

## 2026-06-08 — Stage 3: ha-core REST API and Express server

**Status:** Complete (branch: stage-1-ws-client, commit e0b4f98)

**Decisions:**
- createRouter() factory pattern: deps injected so unit tests run with a stub
  ws-client and no live server (no supertest dependency needed -- Node 24 fetch)
- SSE decided browser transport (not WebSocket) per architecture decision 2
- SseManager singleton with 30s heartbeat -- keeps Cloudflare Tunnel alive
- index.js only runs server when executed directly (import.meta.url guard),
  safe to import in tests
- /entities/:param handles both domain and entity ID via dot-check in one handler
- callService added to ws-client with 10s timeout and { resolve, reject }
  pending requests (upgraded from callback-only pattern)

**Test evidence:**
- 47/47 tests pass (15 new API tests, 32 entity regression tests)
- Live smoke: /health connected:true entityCount:118, /entities 118 entities,
  /rooms [] (empty until client.config.json is populated in Stage 4)

## 2026-06-08 — Stage 2: ha-core entity normalisation

**Status:** Complete (branch: stage-1-ws-client, commit 3c472e2)

**Decisions:**
- Designed against 118 real HA entities (38 domains) captured via ws-client,
  not idealised shapes -- exactly per the kickoff doc prerequisite
- brightness exposed as brightnessPct (0-100), hiding HA's 0-255 scale
- HA naming quirks (temperature/humidity) absorbed here; contract is stable
- supported_features kept as raw number -- bitmask decoding deferred to Stage 5
  (presentation concern, not data concern)
- 29 non-product domains pass through unchanged for forward compatibility
- normaliseEntity is pure; room mapping injected from caller (testable without HA)
- Regression fixtures built from real captured shapes with tokens sanitised
- stage-1 and stage-2 both landed on stage-1-ws-client branch (no rename needed
  unless requested -- all ha-core foundation work fits one branch)

**Test evidence:**
- 32 fixture-based regression tests pass (real HA attribute shapes)
- Live run: 118 entities normalised across 38 domains, zero automation/script/group
  leakage confirmed, correct camelCase contracts on light/climate/media_player/lock

**Also this session:**
- ~/.claude.json recovered from corruption (manual ha-mcp edit left truncated JSON)
  Restored from backup 1780895024481 + ha-mcp block re-injected cleanly
  ha-mcp will load on next Claude Code restart
- CLAUDE.md rules 16 and 17 updated: model/effort are user-typed slash commands,
  never programmatic

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
