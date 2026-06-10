# Functionality Tracker

Living record of what is built, what is in progress, and what is planned.
See SESSION_STATE.md for quick-start session context and PROGRESS.md for the
dated decision log. This file, SESSION_STATE.md, and PROGRESS.md must always
tell a consistent story.

## Complete (committed to git)

### ha-core (Stages 1-3.5)

- WebSocket client: connects to HA, authenticates with a long-lived token,
  exponential backoff reconnect (1s base, 30s cap), entity state cache,
  state_changed event stream
- Entity normalisation: 9 product domains with stable camelCase contracts
  (light, switch, sensor, binary_sensor, climate, camera, lock, media_player,
  scene), 29 passthrough domains for forward compatibility, internal entity
  filtering (group./automation./script.), built against 118 real entities from
  a live HA instance
- Express REST API on port 3001: /entities, /entities/:domain, /entities/:id,
  /services/:domain/:service, /rooms, /rooms/:id/entities, /scenes/:sceneId,
  /health
- SSE stream: /events broadcasts normalised state_changed envelopes
  ({ id, domain, name, state, attributes, lastChanged }) -- NOT the raw HA shape
  ({ entity_id, new_state, old_state }); changed in Stage 4; 30s heartbeat
- SQLite persistence (better-sqlite3): site_events and device_history tables,
  connection lifecycle recording, sampled device history (availability
  transitions always recorded, other changes throttled to 5-min windows),
  90-day pruning, /history/* endpoints
- Backblaze B2 backup: nightly HA snapshot + SQLite + config upload via the
  S3-compatible API, /backup/run endpoint, backup_completed events; skips
  gracefully when credentials absent; SOPS injection point documented for Stage 11
- Preferences API: GET/POST /api/preferences/:key, SQLite-backed, site-scoped,
  composite PK (site_id, key), supports any JSON value, 128 char key limit,
  GET /api/preferences lists all keys for hydration
- 84 ha-core tests passing

### client-app (Stages 4-5.5)

- Vite 8 + React 19 + Tailwind 4 (CSS-first via @tailwindcss/vite, no
  postcss.config.js -- known gotcha, documented in setup/SETUP.md)
- Zustand 5 entity store: Map-based, setEntity/removeEntity, seeded on mount via
  the /api/entities snapshot
- useHA hook: SSE-only, EventSource /api/events, real-time state_changed updates
  confirmed working in browser; no return value
- callService: standalone src/lib/callService.js, throws on non-ok responses, no
  hook wrapper
- White-label config: client.config.json reader, CSS variable injection for the
  primary colour on mount
- PWA manifest + vite-plugin-pwa (GenerateSW mode -- note: switch to
  InjectManifest at Stage 7+ for camera caching)
- React Router 7: BrowserRouter, / redirects to /home, plus /home, /rooms,
  /rooms/:id, /scenes, /cameras, /settings
- App shell: Header (back arrow on room detail, hidden on /home), BottomNav
  (NavLink-based), dark editorial aesthetic (#0c0e14 base, Barlow Condensed
  headers, DM Sans body)
- BottomNav: 5 tabs with filled SVG icons -- Home, Rooms, Scenes, Cameras, Settings
- Home screen dashboard (/home, default route): time-of-day greeting (+ firstName),
  weather widget (HA weather entity), active device summary pills (lights on,
  temperature, unlocked locks), favourite rooms horizontal scroll (default first 3,
  or homeFavourites preference), quick scene pill buttons (1.5s flash feedback,
  scene.turn_on), now playing section (media_player in "playing"); useClock hook
  (60s interval)
- TILE_MAP registry in src/components/devices/index.js: light, switch, sensor,
  binary_sensor, climate, lock (placeholder), media_player (placeholder), cover
  (placeholder), scene, fallback, skeleton -- one-line extension point for every
  device type
- LightTile: card-as-slider drag brightness, full colour control bottom sheet,
  3x3 swatch grid, temperature gradient strip, custom hue/saturation picker,
  server-side favourites via preferences API, room defaults; all modes (onoff,
  brightness, color_temp, hs, rgb, rgbw, rgbww, combo); mobile polish: 75svh
  sheet, 44px close button touch target, temperature slider value prop fixed
- SwitchTile: toggle, full card tappable
- SensorTile: large value display, unit, read-only (also handles binary_sensor)
- ClimateTile: current/target temp, +/-1C, HVAC mode badge
- FallbackTile: name + raw state, read-only
- SkeletonTile: animate-pulse placeholder
- Preferences store (usePreferencesStore): hydrate() from /api/preferences,
  addFavourite/removeFavourite, saveRoomDefault/clearRoomDefault, setHomeFavourites
- Scenes tab (/scenes): SceneList + SceneTile, 2-col grid, tap-to-activate with
  1.5s flash feedback, config-driven from client.config.json scenes array,
  inline SVG icons (sunrise, home-off, sunset, film, moon + star fallback)
- Playwright: automated browser verification for LightTile and home screen at 375px
- 124 client-app unit tests + 6 Playwright browser checks passing; 84 ha-core
  tests; 208 unit tests total across the workspace
- Branch: stage-5-room-detail

### Deployment / Operations (Pi pipeline)

- Three-script deploy pipeline (laptop -> PC -> Pi), reusable for the home POC
  Pi and every client site: `setup/01-enable-ssh-on-pc.ps1` (PC OpenSSH),
  `setup/02-persist-z-drive.ps1` (persistent Z: mapping via cmdkey),
  `setup/03-deploy-pi.ps1` (-Mode Home|Client orchestrator: ping-wait, git
  archive on the PC, SCP to the Pi, run setup streamed live, named exit codes)
- `setup/pi/pi-setup.sh`: idempotent Pi runtime installer (set -euo pipefail +
  error trap), --mode home|client. Installs Docker (official apt repo, arm64
  Bookworm), Home Assistant Container (network_mode: host), Node 20 via nvm,
  nginx, Tailscale, cloudflared, the ha-core systemd service on 3001, and builds
  both PWAs. Sources .env, fails by name on missing required vars
- Two device classes from one script: HOME adds a disabled+masked ops-agent
  systemd stub and Claude Code; CLIENT installs neither, removes any ops-agent,
  and asserts/strips `demo:` from configuration.yaml
- `setup/pi/nginx/smarthome.conf`: :80 client-app, :3002 operator-app, /api
  proxied to ha-core (127.0.0.1:3001) with a dedicated SSE block (proxy_buffering
  off, proxy_read_timeout 3600). ha-core owns 3001; nginx adds no second listener
- `setup/pi/.env.example` (deploy targets + secrets, annotated),
  `ops-agent.service.example` (HOME-only disabled stub)
- Home Assistant runs as a Container, not Supervised (Supervised deprecated as of
  HA OS 2025.12.0). os-agent 1.9.0 recorded as a reference note only
- Living runbooks: setup/pi/PI_SETUP.md (Quick Start / What Gets Installed /
  Manual Steps / Known Issues / Update Log + Future ops-agent layer),
  client-device/CLIENT_DEVICE_SETUP.md, client-device/DEV_VS_CLIENT.md,
  setup/SETUP.md deploy section, provisioning/PROVISIONING.md client-mode step
- Verified on the laptop: PowerShell parse-check (0 errors), `bash -n` on both
  shell scripts, 0 em dashes across all files. Real Pi deploy run manually
- Branch: pi-deploy-pipeline

## In Progress

Nothing — clean stopping point.

## Planned (Stages 6.5-11)

Stage 5.5 (home screen dashboard) and Stage 6 (scenes tab) are complete and
listed under Complete above. The next stage to build is Stage 6.5.

Stage 5.6: Visual elevation pass — iPad-first PoC polish
  Surface elevation system (canvas/surface/raised), typography sharpening, spacing
  rhythm, motion language (tile press, sheet spring, reduced-motion). iPad responsive
  layout: 2-col home, 3/4-col room grids, sidebar nav on md+. Playwright verified
  at 4 viewports. Model: Sonnet. Effort: high.

Stage 5.7: Enterprise widget dashboard
  Variable widget size system (small/medium/large/hero). PoC widget set: lighting,
  climate, security, cameras, scenes, energy, locks, presence, media, garage —
  connected where backend exists, mock data where it doesn't. Three-surface layout:
  phone, tablet, wall (?surface=wall param). Playwright verified at 4 viewports.
  Model: Sonnet. Effort: high.

Stage 6: Scenes tab — COMPLETE (see above)


Stage 6.5: Authentication
  ha-core is the auth authority (JWT). Username/password primary, PIN convenience
  layer on a trusted device. Separate operator tier. Role hierarchy designed for
  future expansion: super-admin, franchisee-admin, technician, client. ALWAYS
  manual -- never agentic. Model: Opus. Effort: xhigh.

Stage 7: Camera view
  MJPEG via HA camera proxy, Frigate person detection badges. Known future task:
  go2rtc/WebRTC for multi-camera over Cloudflare Tunnel. MCP: filesystem + ha-mcp.

Stage 7.5: Push notifications
  Web Push via service worker, VAPID keys, Frigate person detection delivery.
  iOS REQUIRES the PWA installed to the home screen via Safari -- documented in
  CLIENT_HANDOVER.md. Native push (APNs/FCM) planned in Stage 13 React Native.

Stage 8: Operator dashboard
  Site health, HA version, backup status, offline devices, staged rollout
  controls, update groups (canary/wave-1/main), SQLite history endpoints.
  MCP: filesystem + ha-mcp.

Stage 9: Whitelabel validation
  Two config profiles, no code changes between clients, WHITELABEL.md for
  franchisees. MCP: filesystem only.

Stage 10: Production Docker Compose
  ha-core :3001, client-app :3000 via nginx, operator-app :3002 via nginx.
  client-app Docker serves the PWA only. React Native (Stage 13) is a separate
  deployment path not covered by Docker Compose.

Stage 11: Site provisioning
  Guided CLI, entity-to-room mapping, SOPS secrets generation, B2 bucket creation,
  Cloudflare Tunnel setup, Tailscale enrolment, update group assignment. Configures
  the PWA URL; React Native app URL configuration comes later. MCP: filesystem +
  ha-mcp + github.
  Room creation and deletion flows from HA entity discovery — installer maps HA
  entities to rooms during provisioning. client.config.json rooms are demo data
  only; production rooms come from the Stage 11 provisioning workflow.

## Post Stage 11 Roadmap

Stage 12: Remaining core tiles
  LockTile (toggle + confirmation, locked/unlocked state), CoverTile (position
  slider, tilt, open/close/stop), BinaryTile (door/motion/smoke/water, read-only,
  iconography), AlarmTile (arm/disarm with PIN, state colour coding).
  Effort: 2-3 days total.

Stage 13: React Native iOS and Android
  Rebuild client-app in React Native. Same ha-core API, same Zustand store pattern,
  same preferences API. Native push (APNs/FCM), haptic feedback, App Store/Play
  Store. No localStorage -- all state from ha-core. Effort: 3-4 weeks.

Stage 14: Energy dashboard
  Solar generation vs consumption, battery state, grid import/export, Amber
  Electric real-time pricing. Supports: Fronius, SolarEdge, Sungrow, Huawei,
  Goodwe, Enphase, Tesla Powerwall. EnergyTile + dedicated /energy route.
  Effort: 1-2 weeks.

Stage 15: MediaTile and audio integration
  Full now-playing with album art, playback controls, volume, room routing.
  OwnTone + Node.js HEOS bridge integration. Sonos, Apple TV, Samsung TV via HA.
  Effort: 2-3 weeks.

Stage 16: Kiosk tablet app
  New kiosk-app package in the monorepo. Always-on layout: no bottom nav,
  persistent camera feeds, large touch targets, room overview always visible.
  Hardware bundle: pre-configured iPad + wall mount. Same ha-core API.
  Effort: 1-2 weeks.

Stage 17: Franchisee management
  operator-app multi-tenant. Role hierarchy: super-admin, franchisee-admin,
  technician, client. Licence fee tracking. White-label config management per
  franchisee. Effort: 2-3 weeks.

Stage 18: AI vision layer
  Frigate zones + Claude vision API for garden/lawn monitoring, package detection,
  vehicle identification, robot mower zone targeting. ha-core automation layer,
  not a frontend change. Effort: 1 week per use case.

Stage 19: Advanced automation builder
  Visual node-based automation editor (like Homey Flow). No-code interface for
  clients to build their own automations. Most complex stage in the full roadmap.
  Effort: 4-6 weeks.
