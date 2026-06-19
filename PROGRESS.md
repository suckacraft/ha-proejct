# Progress Log

See also SESSION_STATE.md for quick-start context for new sessions.

## 2026-06-13 — Marketing site (smartboyz.com) scaffolded

**Status:** In progress (branch: feat/marketing-site). New package only; product
apps, ha-core, and deploy tooling for smarthome-app untouched.

**Why:** smartboyz.com (apex/www) was unused — the brand had a product and an
installer story but no public, customer-facing landing page. Added one, leading with
the homeowner app experience + the done-for-you installation/support service.

**Decisions (with rationale):**
- **Stack: Astro 6 static + React islands + Tailwind v4 + MDX**, deployed to a NEW
  Cloudflare Pages project `smartboyz-www` (distinct from `smarthome-app`). Chosen via
  deep-research for best Core Web Vitals/SEO on a content site; static output avoids the
  SSR adapter. `output:'static'`, dev port 5175.
- **Tailwind v4 via `@tailwindcss/postcss`** (PostCSS, see `postcss.config.mjs`), no
  `tailwind.config`. NOT the `@tailwindcss/vite` plugin: it breaks on the rolldown-based Vite
  that Astro 6 bundles ("Missing field tsconfigPaths"). `overrides.vite:^7` pins Vite. The
  `@theme` token approach is the same as client-app; only the plumbing differs.
- **Brand tokens:** surface scale (canvas/surface/raised/border) shared with
  `client-app/src/index.css`; the **accent intentionally diverges** to electric orange
  `#f97316` (marketing brand brief) vs client-app's blue `#2563eb`. Future: extract
  `packages/brand/tokens.css` for the shared surfaces — deferred.
- **Fonts self-hosted** via `@fontsource` (Barlow Condensed + DM Sans) instead of a Google
  Fonts `<link>` — better LCP/CLS on a marketing page.
- **Lead form** = Cloudflare Pages Function `functions/api/lead.ts` (works with static
  output). Destination is **TBD** via `LEAD_WEBHOOK_URL` env; until set it validates +
  accepts + logs (honest stub, no fake "connected"). Only hydrated island on the site.
- **Claude tooling:** added root `.mcp.json` (shadcn + Playwright MCP) and a package-level
  `CLAUDE.md`; `frontend-design` skill applied within the locked brand tokens.

**Deviations from root CLAUDE.md (deliberate):**
- Rule 14 (Docker Compose for local dev) does NOT apply — the marketing site is a
  standalone static Astro build outside the service mesh; runs via `astro dev`.
- npm workspace `-w` does not resolve on the `Z:` drive (ERESOLVE/"No workspaces found").
  Per-package install via `--prefix packages/marketing-site`, matching the repo's already-
  adapted `deploy:pages` script. Added `deploy:www` in the same `--prefix` + `npx wrangler`
  style.

**Environment note (`Z:` = `\\JOSH\smarthome`, a remote SMB share):** `npm install` over this
share is slow (~9 min) and intermittently DROPS individual files mid-write (sharp's native
`.node`, `yargs-parser`, Vite `dist`, MDX/markdown deps) and LOCKS dirs against rmdir
(EPERM/EBUSY/ENOTEMPTY) — almost certainly antivirus on the host scanning share writes. Net
effect: a reliable local `node_modules` on `Z:` is not currently achievable from this machine.
Mitigations in place: (1) Astro image service is `passthrough` on win32, `sharp` on Linux — so
sharp is not needed locally and Cloudflare's Linux build still optimizes images; (2) local
verification was done by installing into a local-disk dir and building/serving there (build OK:
3 pages, sitemap, dev server on :5175, visually verified mobile/tablet/desktop). **Deploy via
GitHub→Cloudflare (Linux) — do NOT rely on `npm run deploy:www` from this Windows/SMB machine.**

**Content:** all copy in `src/content/site.ts` is realistic placeholder with `TODO(content)`
markers — needs real value props, pricing, testimonials, service area, and lead destination.

## 2026-06-10 - Pi deployment pipeline + franchise ops system

**Status:** Complete (branch: pi-deploy-pipeline). No application logic changed.
All work is deploy tooling and operations documentation under setup/ and
provisioning/ only. packages/, ha-core, and app code untouched.

**Decision (hard to reverse, raised before building):**
- Home Assistant on the Pi is installed as a CONTAINER (docker compose,
  network_mode: host), NOT Supervised. Fetched the current install sequences as
  required: HA Supervised is officially deprecated ("unsupported with the Home
  Assistant OS 2025.12.0 release") and conflicts with the existing Container
  docs. ha-core talks to HA over WS + token, so the flavour is irrelevant to the
  platform. os-agent 1.9.0 (2026-05-22) is recorded in PI_SETUP.md as a
  reference note only. User confirmed Container before any code was written.
- Port 3001: ha-core owns 3001 as its own systemd service, so nginx does NOT add
  a second 3001 listener (two processes cannot bind one port). nginx serves the
  apps on :80 and :3002 and proxies /api to 127.0.0.1:3001 with SSE settings.
  User confirmed this resolution before pi-setup.sh was written.

**What was built:**

Deploy pipeline (laptop -> PC -> Pi), all scripts print their version at startup:
- `setup/01-enable-ssh-on-pc.ps1` - PC (JOSH) Admin: install/start OpenSSH
  Server, Automatic startup, port 22 firewall rule, print IP/user. Idempotent.
- `setup/02-persist-z-drive.ps1` - laptop: persist Z: -> \\JOSH\smarthome via a
  stored cmdkey credential (never re-prompts), reconnects if dropped. Idempotent.
- `setup/03-deploy-pi.ps1` - laptop orchestrator: -Mode Home|Client, ping-wait
  for the Pi, git archive the repo on the PC, SCP PC->laptop->Pi plus the .env,
  unzip on the Pi, run pi-setup.sh streamed live. Named exit codes per phase.

Pi-side (`setup/pi/`):
- `pi-setup.sh` - runtime installer, set -euo pipefail + error trap (line +
  command), version banner, --mode home|client (defaults to restrictive client),
  sources .env and fails by name on missing HASS_URL/HASS_TOKEN. Installs Docker
  (official apt repo, arm64 Bookworm), HA Container (network_mode: host), Node 20
  via nvm + npm ci, nginx + site config, Tailscale (TS_AUTHKEY, Tailscale SSH),
  cloudflared (token service stub), ha-core systemd service on 3001, builds both
  PWAs. Home adds the masked ops-agent stub + Claude Code; client removes any
  ops-agent and asserts/strips demo: from configuration.yaml.
- `pi-setup-client.sh` - thin wrapper: exec pi-setup.sh --mode client.
- `nginx/smarthome.conf` - :80 client-app, :3002 operator-app, /api -> ha-core
  upstream with a dedicated /api/events SSE block (proxy_buffering off,
  proxy_read_timeout 3600, Connection cleared, HTTP/1.1).
- `.env.example` - deploy targets (PC_IP/PC_USER/PI_IP) + TS_AUTHKEY,
  CF_TUNNEL_TOKEN, HASS_URL, HASS_TOKEN, B2_* and a commented CLAUDE_OPS_API_KEY,
  each annotated with what it is and where to get it.
- `ops-agent.service.example` - disabled, masked, HOME-PI-ONLY systemd stub with
  no agent logic; ExecStart points at a deliberately nonexistent script.

Docs (living runbooks):
- `PI_SETUP.md` - rewritten into runbook shape: Quick Start, What Gets Installed,
  Manual Prerequisites, Manual Steps After Deploy, Future ops-agent layer,
  os-agent reference note, Known Issues (port 3001, SSE headers, host networking,
  demo:), Update Log v2.0. Docker/HA manual steps marked automated.
- `client-device/CLIENT_DEVICE_SETUP.md` - added the client-mode deploy section.
- `client-device/DEV_VS_CLIENT.md` - added deploy mode, ops-agent, Claude Code,
  CLAUDE_OPS_API_KEY rows.
- `setup/SETUP.md` - added the deploy-pipeline section + Update Log v1.8.
- `provisioning/PROVISIONING.md` - added the client-mode deploy step and the
  explicit "demo: is NOT in configuration.yaml" assertion.

**Test evidence:**
- All 3 PowerShell scripts parse clean via
  [System.Management.Automation.Language.Parser]::ParseFile (0 errors each).
- pi-setup.sh and pi-setup-client.sh pass `bash -n` (shellcheck not on the
  laptop; nginx -t and live run happen on the Pi during deploy).
- Em-dash scan: 0 occurrences of U+2014 across all 13 created/modified files.
- Real Pi deploy is a manual step the user runs (no Pi attached this session).

**Next:** Run `setup\03-deploy-pi.ps1 -Mode Home` against the lab Pi to validate
end to end, then resume app work at Stage 5.7.

## 2026-06-08 — Dev tooling + management dashboard + provisioning docs

**Status:** Complete (branch: stage-5-room-detail). No application logic changed.
All commits are tooling, infrastructure, and documentation.

**Commits this session, in order:**
- `ce39e57` — tooling: dev launcher scripts and .env.local template
- `8d4d9ea` — fix: dev scripts Windows PowerShell 5.1 compatibility
- `3236075` — fix: operator-app Tailwind 4 and module type config
- `b46c8f7` — fix: dev.ps1 kills existing processes before starting
- `bcd1446` — feature: one-click launch + browser management dashboard at /manage
- `79cfb4f` — fix: management dashboard HTTP health checks
- `118e966` — feature: restart all services from management dashboard via PID tracking
- `fca1af8` — polish: service descriptions in management dashboard
- `bc0dae9` — fix: ha-core root redirect to /manage and health URL in dashboard
- `25a6fbd` — fix: dev.ps1 syntax error in watch loop
- `843e6bd` — docs: add PowerShell encoding known issue to SETUP.md
- `98205dc` — fix: clear log files on stop and start to prevent file lock errors
- `d5ed65f` — fix: log file lock -- use stream redirection instead of Tee-Object
- `ab15113` — provisioning: device discovery protocol documented and wired into Stage 11
- `b3c0076` — fix: write-protect hook path-specific not pattern-match
- `0b979eb` — fix: stop.ps1 timing -- wait for process handle release before deleting logs

**What was built:**

Dev tooling suite (scripts/):
- `dev.ps1`: launches ha-core, client-app, operator-app in separate PowerShell windows
  with auto-relaunch watch loop if any service exits. Writes `.pids` for dashboard
  restart support. Clears logs and stale-logs on each launch.
- `stop.ps1`: kills all services by port, kills orphaned node processes, waits 500ms
  for handle release, deletes logs. Any still-locked logs written to `.stale-logs`
  for cleanup on next run.
- `start.bat`: one-click launcher for the whole platform.
- `.env.local`: template for HASS_TOKEN/HASS_URL.

Management dashboard (`/manage`, ha-core):
- Browser dashboard at http://localhost:3001/manage showing all four services
  (ha-core, client-app, operator-app, home-assistant) with status badges, port,
  plain-English descriptions, and action buttons.
- Health checks use HTTP GET (not TCP socket) -- fixes false STOPPED for Vite/client-app.
- Restart buttons work for all services: ha-core via exit(1)/nodemon, client-app and
  operator-app via PID kill from `.pids` + dev.ps1 auto-relaunch.
- `GET /` on ha-core redirects to `/manage` instead of blank error page.

Provisioning docs:
- `PROVISIONING.md`: Device Discovery Protocol section added (IP/Zigbee/Z-Wave/
  Bluetooth/433MHz/Matter checklists, final inventory).
- `site.config.json`: `devices` block added (protocol flags + deviceCount fields).
- `CLAUDE.md`, `HA_PROJECT_KICKOFF_PROMPT.md`, `PIPELINE_PROMPT.md`: Stage 11
  device discovery automation wired in as a required deliverable.

Infrastructure fixes:
- Write-protect hook updated to path-specific matching (was blocking all config.json).
- PowerShell encoding gotcha documented in SETUP.md (em dashes in string literals).
- Log file lock root cause fixed: Tee-Object pipeline replaced with `*>` redirection.

**Test evidence:** (see below -- run at checkpoint)

**Next:** LightTile mobile polish at 375px, then Stage 6 (scenes tab).

## 2026-06-08 — Session close: documentation refresh + housekeeping

**Status:** Complete (branch: stage-5-room-detail). Documentation-only session
plus end-of-day housekeeping. No application logic changed.

**Commits today, in order:**
- `582faab` — enhance: LightTile full colour and temperature control
- `7f8c11c` — fix: LightTile controls (toggle, drag brightness, colour tap)
- `e216c63` — feat(ha-core): per-site preferences API (SQLite key/value store)
- `d1cffd4` — feat(client-app): favourites and room defaults via preferences API
- `504bf02` — polish: mobile UI (bottom sheet, tile designs, touch targets)
- `e9eb8a9` — feat(client-app): home screen dashboard with bottom nav icons
- `029f02f` — feat(client-app): colour sheet UX improvements
- `2801685` — checkpoint: end of session (home screen, colour sheet polish, docs)
- `8deeaed` — docs: full roadmap and documentation structural refresh (Stages 12-19)
- `772eb64` — chore: gitignore test-results directory
- (a closing checkpoint commit follows this entry: Stages 1-5.5 complete, docs
  refreshed through Stage 19, LightTile polish in progress)

**What was built (now complete and committed):**
- ha-core complete (Stages 1-3.5): WebSocket client, entity normalisation
  (118 real entities, 9 product domains + 29 passthrough), Express REST API,
  normalised SSE stream, SQLite persistence + history, Backblaze B2 backup, and
  the per-site preferences API.
- client-app Stages 4-5.5: Vite 8 + React 19 + Tailwind 4 foundation, white-label
  config, SSE-only useHA, Zustand entity store, React Router 7, TILE_MAP tile
  registry, room detail + tiles.
- LightTile full colour control: drag-brightness card + colour bottom sheet
  (temperature strip, 3x3 swatches, custom hue/sat picker), all light modes.
- Preferences API consumption: server-side favourites + room default brightness,
  no localStorage.
- Home screen dashboard (/home, default route): time-of-day greeting, weather
  widget, active device summary, favourite rooms, quick scenes, now playing.
- Colour sheet UX improvements: active swatch indication, inline save/rename,
  long-press menu, floating kelvin label, optimistic preview.

**Documentation refresh (commit `8deeaed`):**
- FUNCTIONALITY.md rewritten (Complete / In Progress / Planned / Post-Stage-11).
- Stage 5.5 home screen documented as delivered across the kickoff prompt,
  pipeline queue, MCP schedule, and staff onboarding.
- setup/SETUP.md known issues added (Tailwind 4 postcss, iOS Web Push, expanded
  stale-ha-core restart steps), v1.5 update-log entry.
- Provisioning, client handover, and managed-service docs updated.
- Full Stage 12-19 roadmap added and verified identical across the three planning
  docs.

**Housekeeping this session:**
- client.config.json: `firstName` "Josh" added manually (home screen greeting).
- test-results/ added to .gitignore (`772eb64`).

**What is in progress:**
- LightTile mobile polish — bottom sheet 75% height, 3x3 swatch grid layout, 48px
  touch targets, active colour indication. Non-blocking refinement on the
  already-committed colour control.

**Test evidence:**
- `npm test --workspaces`: 119/119 client-app, 84/84 ha-core (6 live-HA
  integration tests skipped), 203 passed total, 0 failures. operator-app has no
  test script yet (skeleton until Stage 8).

**Current branch:** stage-5-room-detail.

**Next:** Complete LightTile mobile polish, verify at 375px in browser, then
Stage 6 (scenes tab). Model: claude-sonnet-4-6. Effort: high.

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
