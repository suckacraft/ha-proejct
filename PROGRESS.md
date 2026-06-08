# Progress Log

See also SESSION_STATE.md for quick-start context for new sessions.

## 2026-06-08 — Pre-Stage 6 UI polish + home screen

**Status:** Complete (branch: stage-5-room-detail).

**Commits this session:**
- `582faab` — LightTile full colour and temperature control
- `7f8c11c` — LightTile controls fix (rgbww/toggle/drag unified)
- `e216c63` — ha-core per-site preferences API (SQLite)
- `d1cffd4` — client-app favourites + room defaults via preferences API
- `504bf02` — mobile UI polish (bottom sheet, tile designs, touch targets)
- `e9eb8a9` — home screen dashboard + 5-tab BottomNav with icons
- `029f02f` — colour sheet UX improvements (active swatch, inline save, long-press)

**LightTile redesign (commits `582faab`, `7f8c11c`):**
- Card-as-brightness-drag with warm radial glow (scales with brightness).
- Bottom sheet: temperature strip, 3×3 swatch presets, custom H/S picker.
- `resolveMode()` correctly handles rgbww/rgbw/xy; unified `<div>` card with
  power icon on every variant.
- Verified in browser at 375px via Playwright.

**ha-core preferences API (commit `e216c63`):**
- `preferences(site_id, key, value, updated_at)` table, UPSERT on conflict.
- `GET /preferences`, `GET /preferences/:key`, `POST /preferences/:key`.
- Used by client for favourites, room defaults, home favourites.

**Client-side favourites + room defaults (commit `d1cffd4`):**
- `usePreferencesStore`: hydrates from `/api/preferences` on mount.
- `addFavourite` / `removeFavourite` + `saveRoomDefault` / `clearRoomDefault`.
- RoomDetail: default brightness slider, Apply button, clear.
- LightTile: Save to Favourites (inline name input), fav swatches before presets.
- Playwright verification passed at 375px.

**Mobile UI polish (commit `504bf02`):**
- Bottom sheet: 75svh, spring animation, primary-tint border, X close button.
- Light tiles: two designs — onoff (centred icon) vs colour-capable (drag+glow).
- Sensor tiles: 32px value, 11px muted caps.
- Climate tiles: current→target temp inline, colour-coded pills, ±44px buttons.
- RoomDetail: flex gap-3, divider after heading.

**Home screen dashboard (commit `e9eb8a9`):**
- `/home` as default route; shared Header hidden on home.
- HomeScreen: greeting (time-of-day + firstName), weather widget, active
  summary pills (lights on, temperature, locks), favourite rooms horizontal
  scroll (default first 3), quick scene pills, now playing section.
- BottomNav: 5 tabs with filled SVG icons (Home, Rooms, Scenes, Cameras, Settings).
- `useClock` hook (1-min interval), `homeFavourites` in preferences store.

**Colour sheet UX improvements (commit `029f02f`):**
- Active swatch: scale(1.1) + white ring + 0.6 opacity on inactive + checkmark.
- Tap ripple (scale flash). Separate Saved/Colours sections with labels.
- Inline name input for saving favourites (max 6 total, Enter/Escape).
- Long-press 500ms context menu (Rename/Delete action sheet at sheet bottom).
- Floating kelvin label on temp drag, disappears 1s after release.
- Swipe-to-dismiss blocked when sheet content scrolled down.
- Optimistic colour preview on tile colour circle after swatch tap.

**Test evidence:**
- 119/119 client-app unit tests pass (13 test files).
- 84/84 ha-core tests pass.
- 203 total tests across workspace.

**Next:** Stage 6 — SSE reconnect + disconnect UI state (Sonnet, high effort).

## 2026-06-08 — LightTile redesign + ha-core preferences API

**Status:** Complete — superseded by entry above. Details preserved below.

**Status at that point:** In progress (branch: stage-5-room-detail). Parts 1–2 complete.

**LightTile redesign (commit `582faab`):**
- Card-as-brightness-drag with Hue/iOS-style warm radial glow that scales with
  brightness; colour controls moved into a bottom sheet (temperature strip, swatch
  presets, custom hue+sat picker). Verified in browser at 375px via Playwright.
- 34-test suite covers all five modes, sheet contents, and service dispatch.

**LightTile control fixes (commit `7f8c11c`):**
- `resolveMode` treated `rgbw`/`rgbww`/`xy` lights as `onoff` (exact-match gap), so
  the Living Room RGBWW card rendered as a dead toggle — no power icon, no drag, no
  colour circle. Now recognised as colour-capable.
- Unified the two card variants (`<button>` for onoff, `<div>` for the rest) into a
  single draggable `<div>`; the power icon is now rendered on EVERY card, so toggle
  is never gated behind colour-mode detection. Non-dimmable cards toggle on body tap;
  dimmable cards drag for brightness and toggle via the icon. `setPointerCapture`
  guarded for jsdom.
- Verified live at 375px: power icon + colour circle on both RGBWW and Ceiling cards,
  drag raised Ceiling 40%→100% (confirmed in ha-core), colour-circle tap opened sheet.

**ha-core preferences API (Part 2):**
- New `preferences(site_id, key, value, updated_at)` table, composite PK `(site_id,
  key)` — gives both tenant isolation (Rule 4) and the lookup index. `value` is
  JSON text, so any payload shape round-trips (objects, arrays, primitives, null).
- `db.js`: `getPreference`, `getAllPreferences`, `setPreference` (UPSERT via
  `ON CONFLICT`). All siteId-scoped. Returns parsed values; absent key → null.
- Routes: `GET /preferences` (site map for hydration), `GET /preferences/:key`
  (`{key, value}`, value null when unset — absence is normal, not a 404),
  `POST /preferences/:key` with `{ value }` envelope (handles primitives despite
  Express strict JSON; 400 if value missing or key > 128 chars).
- All state lives in ha-core, never the browser — keeps the PWA and future
  native/kiosk surfaces in sync (Future Architecture rule).
- Verified live against :3001 — POST/GET round-trip of an object, primitive string
  (room default), list endpoint, and all 400 paths. db file is gitignored; schema
  migrates at runtime via `CREATE TABLE IF NOT EXISTS`.

**Test evidence:**
- 84/84 client-app unit tests pass.
- 84/84 ha-core tests pass (6 live-HA integration tests skipped), incl. 9 new db
  preference tests + 8 new API route tests.

**Next:** Part 3 — client-side favourites + room defaults consuming this API (Sonnet).

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

**Bugs fixed (post-review):**
- `useHA` seeded no initial state — SSE only delivers future changes; store was empty at startup so all tiles rendered as SkeletonTile. Fixed by adding `fetch("/api/entities")` snapshot call on mount (EventSource opened first to avoid missing events during fetch window). Commit: `e98c0c5`.
- SSE real-time sync silent failure — ha-core had been running Stage 3.5 code (started before Stage 4 normalization commit, no nodemon watching, process never restarted). Stage 3.5 broadcast the raw ws-client event shape `{ entity_id, new_state, old_state }` directly. `useHA` expects the normalized envelope `{ id, ... }`, so `data.id` was always `undefined` and all SSE updates wrote to the wrong Map key. Fix: restart ha-core with Stage 4+ code — `wireEvents` already normalizes correctly. Root cause documented in SETUP.md Known Issues. Confirmed: toggles update tiles within 2 seconds, two-way HA↔app sync working without refresh.

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
