# HA Smart Home Platform — Claude Code Kickoff Prompt

Paste Section 1 into a fresh Claude Code session first.
Then follow the staged prompts in Section 2 one at a time.
Do not proceed to the next stage until the current one is confirmed working.

---

## PREREQUISITE — DO THIS BEFORE PASTING ANYTHING

The entire ha-core design assumes Home Assistant entities normalise cleanly
into our internal format. Real HA entities are messy and vary by integration.
The spec is only as good as the data it meets, so get real HA running before
you start, while the Pi is still in transit.

Before Stage 1:
1. Install Home Assistant in Docker on your laptop (or any spare machine)
2. Add at least two real integrations so you have varied entity shapes to
   test against -- the built-in demo integration, plus one real one (a
   Shelly, a Zigbee device via your dongle, or even the HA "sun" and
   "weather" integrations which produce rich attribute data)
3. Generate a long-lived access token (Profile > Security > Long-lived
   access tokens) and have it ready for ha-core config.json
4. Confirm you can reach the HA WebSocket API at ws://localhost:8123/api/websocket

When ha-core is built it will then be testing against real entity
attributes, not idealised ones. This single step de-risks the whole
ha-core layer.

Session habit (set this for yourself, not just for Claude):
End every working session with "update PROGRESS.md before we stop."
The spec instructs Claude to do this, but the failure mode is you
forgetting to ask. This is the cheapest insurance against re-explaining
the project next session.

---

## SECTION 1 — OPENING PROMPT

Copy everything below this line down to the Section 2 heading and paste it into Claude Code.

---

I am building a professional smart home integration platform for a new business
in Victoria, Australia. This is not a personal hobby project — it is the
technical foundation of a commercial operation. The platform must be:

- White-labelable for future licensing to other integrators
- Supportable for 5+ years without major rewrites
- Built with a clean separation between the HA integration layer and the
  client-facing frontend
- Designed to be multi-tenant from the start (one codebase, many client sites)

---

### BUSINESS CONTEXT

The business installs Home Assistant-based smart home systems for mid-market
Victorian homeowners (3BR homes, $6,000-8,000 AUD installs). The tech stack
per client site is:

- Home Assistant (supervised, on a mini PC or Pi 5 8GB)
- Zigbee2MQTT (device control -- lights, sensors, locks)
- Shelly relays (legacy retrofit lighting)
- Frigate NVR + Google Coral TPU (local AI security cameras)
- Tailscale (secure remote access for managed service)
- OwnTone + Node.js HEOS bridge (multi-room audio)
- Sensibo (climate control)

The key long-term differentiator is a CUSTOM PWA FRONTEND that sits on top of
Home Assistant via its WebSocket API. Clients never see Home Assistant. They
see a branded, room-based interface that we control, design, and iterate on.
This frontend is the product -- HA is the engine.

---

### WHAT WE ARE BUILDING

A monorepo with three layers:

**1. HA INTEGRATION LAYER (ha-core)**
A Node.js service that connects to the Home Assistant WebSocket API and REST
API. Abstracts all HA complexity into clean, versioned internal APIs. This is
the adapter layer -- it insulates the frontend from HA internals so HA updates
never break the client-facing experience.

**2. CLIENT PWA FRONTEND (client-app)**
A React PWA. Dark, editorial aesthetic. Room-based navigation. Scenes
(Morning, Away, Evening, Movie, Sleep). Real-time device state. Mobile-first,
installable on Android and iOS. No HA branding anywhere. White-label ready --
logo, colours, and client name are config variables, not hardcoded.

**3. OPERATOR DASHBOARD (operator-app)**
A separate React app for us (the integrator) to monitor client sites remotely.
Shows all managed sites, device health, offline alerts, HA version per site,
last backup status. This is the managed service control plane.

---

### TECHNICAL REQUIREMENTS

Stack:
- Node.js + Express for ha-core
- React + Vite for client-app and operator-app
- Zustand for client-app and operator-app state management. Do NOT use
  React Context as the primary store for entity state -- with real-time
  WebSocket updates, Context causes every entity change to re-render the
  whole tree. Zustand allows granular subscriptions so only the affected
  component re-renders.
- Tailwind CSS for styling
- WebSocket for real-time HA state
- REST for HA commands
- Remote connectivity (two distinct paths -- do not conflate them):
  - OPERATOR/SUPPORT access: Tailscale. We reach every client site over
    our tailnet for monitoring and support. No open ports. This is
    pre-existing infrastructure, not built here.
  - CLIENT remote access: Cloudflare Tunnel per site. When a client is
    away from home, their PWA reaches ha-core through a Cloudflare Tunnel
    with no open ports on their router and HTTPS handled at the edge. The
    client installs nothing extra -- they just open the app. We accept one
    cloud dependency in the control path in exchange for a frictionless,
    product-grade experience.
- Data locality: automation logic, recordings, and device state stay
  local on client hardware. Only the encrypted control channel transits
  the tunnel, and only when the client is away from home. This preserves
  the "your data stays in your home" client promise.
- Docker Compose for local dev and production deployment

Dependency discipline (this platform must be supportable for 5+ years):
- Pin EXACT versions in every package.json (no ^ or ~ ranges)
- Commit lockfiles (package-lock.json) for every package
- We choose when to upgrade, never npm at install time
- Document the pinned HA WebSocket library version specifically, since
  it is the dependency most likely to drift against HA core changes

Multi-tenancy approach:
- Each client site runs its own ha-core instance on the same box as HA,
  pointing to their local HA
- The client-app is configured per site via a config.json (client name, logo
  URL, primary colour, room layout)
- The operator-app aggregates across sites via Tailscale hostnames
- Client remote access is via per-site Cloudflare Tunnel, kept entirely
  separate from the operator Tailscale path

White-label approach:
- Brand tokens (logo, colours, name) in a single config file
- No hardcoded brand references anywhere in the codebase
- Future integrators get a forked repo + config file, nothing else

Supportability requirements:
- All integrations versioned and documented
- HA WebSocket connection with automatic reconnect and error handling
- Comprehensive logging in ha-core
- Config backup automation built in from day one
- README.md per package explaining setup, config, and maintenance

Architecture decisions (locked -- do not deviate without explicit approval):

1. ha-core to HA communication: localhost. Simple, universal, works on
   every client box without special Docker configuration.

2. Real-time updates to browser: SSE (Server-Sent Events) from ha-core
   to client-app for state changes. REST for commands (turning devices
   on/off, triggering scenes). WebSocket is used only server-side between
   ha-core and HA where there is no Cloudflare Tunnel in the path. SSE
   is more reliable than WebSocket through Cloudflare Tunnel.

3. Credential storage on client boxes: SOPS encrypted secrets. Credentials
   are encrypted at rest on the box. Only decryptable with a key held by
   the operator. Protects against physical access to the comms cabinet.
   Plain .env files are NOT acceptable.

4. Backup strategy: two-layer.
   - HA built-in snapshot (HA config, automations, integrations)
   - Nightly rsync of everything (HA snapshot, ha-core SQLite database,
     all config files) to Backblaze B2, encrypted before upload
   - Cost is under $1 AUD per site per month
   - Target recovery time from complete box failure: under one hour

5. Camera footage retention: two-layer.
   - Continuous recording to local NVMe SSD (7-30 days depending on
     drive size and camera count)
   - Labelled event clips (person detection, doorbell, zone breach) pushed
     automatically to Backblaze B2 off-site. Retained for 90 days.
     Cost is cents per site per month.
   - Clients get searchable event history that survives hardware failure

6. HA update management: staged rollout via operator dashboard.
   - Stage 1: operator's own home system (canary)
   - Stage 2: mum's house and one trusted early client (48hr hold)
   - Stage 3: all remaining sites pushed from operator dashboard
   - Failed updates automatically roll back to last good Backblaze snapshot
   - Auto-update is disabled on all client sites permanently
   - The operator dashboard HA version field is functional, not decorative

---

### CROSS-CUTTING REQUIREMENTS (apply to every stage)

These apply throughout the build. Do not treat them as a separate stage --
they are standing requirements that every stage must satisfy.

Definition of done (every stage):
- Happy path works AND error states are handled
- Loading states present wherever data is fetched
- Works correctly on a mobile viewport (375px wide minimum)
- No console errors or warnings
- The stage test passes with visible evidence (output or screenshot)

Error and offline UX (specify once, reuse everywhere):
- When ha-core is unreachable, the client-app shows a non-blocking
  connection banner and displays last-known entity state, not a blank
  or broken screen
- When HA is mid-restart (SSE connection drops), the app shows a
  reconnecting state and recovers automatically when the connection
  returns
- Individual unavailable entities render greyed out with an "unavailable"
  label, never as broken or missing cards
- All async actions (service calls) show pending state and surface a
  clear failure message if the command does not confirm
- Offline mode (client has no internet, away from home):
  - Display last known entity state from the Zustand store (cached from
    last successful SSE stream)
  - All control buttons disabled with a clear visual state
  - A non-blocking "You're offline -- controls unavailable" banner
  - Do NOT queue commands for replay on reconnect. A queued lock or
    security command firing unexpectedly is a safety issue.
  - Reconnects and resumes live state automatically when internet returns

Version control discipline:
- Initialise git at project start
- Commit after each stage passes its test, with a clear message
  (e.g. "Stage 3 complete: ha-core REST API and Express server")
- This lets us roll back a broken stage without losing the last good one

Testing:
- ha-core entity normalisation and REST endpoints must have basic
  automated tests, since this is the layer HA updates are most likely
  to break. A regression test here warns us before a client does.

---

### PROJECT STRUCTURE TO CREATE

    smarthome-platform/
    +-- CLAUDE.md                  # Persistent Claude Code instructions
    +-- FUNCTIONALITY.md           # Living document of what is built
    +-- PROGRESS.md                # Session progress tracking
    +-- README.md                  # Project overview
    +-- docker-compose.yml         # Full stack local dev
    +-- packages/
        +-- ha-core/               # HA WebSocket + REST adapter
        |   +-- src/
        |   |   +-- ws-client.js   # WebSocket connection manager
        |   |   +-- api.js         # REST endpoint wrappers
        |   |   +-- entities.js    # Entity state normalisation
        |   |   +-- events.js      # HA event stream handler
        |   |   +-- index.js       # Express server entry point
        |   +-- config.json        # HA URL, token, site ID
        |   +-- package.json
        +-- client-app/            # Client-facing PWA
        |   +-- src/
        |   |   +-- components/
        |   |   |   +-- rooms/     # Room view components
        |   |   |   +-- devices/   # Light, climate, camera, lock components
        |   |   |   +-- scenes/    # Scene trigger buttons
        |   |   |   +-- shared/    # Shared UI components
        |   |   +-- hooks/         # useHA, useRoom, useScene custom hooks
        |   |   +-- store/         # State management
        |   |   +-- config/        # White-label config reader
        |   |   +-- App.jsx
        |   +-- client.config.json # White-label: name, logo, colours, rooms
        |   +-- package.json
        +-- operator-app/          # Integrator management dashboard
            +-- src/
            |   +-- components/
            |       +-- SiteCard/  # Per-site health summary
            |       +-- AlertFeed/ # Cross-site alerts
            |       +-- SiteDetail/# Drill-down per site
            +-- App.jsx
            +-- package.json

---

### CLAUDE.md RULES TO ESTABLISH

When you create CLAUDE.md, include these standing rules.
Keep the file under 200 lines total. Every rule must earn its place --
if Claude already does something correctly without being told, do not
include that rule. A bloated CLAUDE.md causes rules to be ignored.

ARCHITECTURE RULES

1. Never hardcode client names, logos, or brand colours. Always reference
   client.config.json.
2. Never build direct HA API calls into the client-app. All HA communication
   goes through ha-core.
3. Every new integration must have a corresponding entry in FUNCTIONALITY.md.
4. At context limit or session end, update PROGRESS.md with: what was
   completed, what is in progress, any blockers, and key decisions made.
5. Config values always come from environment variables or config.json, never
   hardcoded.
6. All WebSocket connections must implement reconnection logic with exponential
   backoff.
7. Pin exact dependency versions in package.json. No ^ or ~ ranges. Commit
   lockfiles. We choose when to upgrade.
8. Use Zustand for entity state, never React Context as the primary store.
   Granular subscriptions only -- a single entity update must not re-render
   the whole tree.

AESTHETIC RULES

9. The client-app aesthetic is dark, editorial, and premium. No generic AI
   dashboard aesthetics. No purple gradients. No rounded pill buttons.
   Think: a well-designed native app, not a React admin template.
10. No em dashes anywhere in code comments or documentation.

WORKFLOW RULES

11. Before writing any code for a new stage, enter plan mode (Shift+Tab).
    Propose the implementation plan and wait for approval before touching
    any files.
12. Show evidence of success, not assertions. After each stage test, show
    the actual command output or log -- not just "it worked".
13. When a bug appears, state which file was last successfully written,
    the exact error, and the proposed fix. Wait for approval before
    changing anything.
14. Do not refactor code outside the direct scope of the current task.
15. Never run more than 2 MCPs simultaneously (Stage 11 is the only
    exception). Before starting any stage, confirm which MCPs should
    be active and deactivate any that are not on the schedule for
    that stage. Run claude mcp list at the start of every session.

COMMON BASH COMMANDS

    npm run dev          start all services in development mode
    npm run build        build all packages
    docker compose up    start full stack locally
    docker compose logs  tail all service logs

---

### START HERE

Please complete the following steps in order:

1. Create the full monorepo directory structure above
2. Create CLAUDE.md with the rules above
3. Create a skeleton FUNCTIONALITY.md and PROGRESS.md
4. Create the root README.md explaining the three-layer architecture
5. Create the root docker-compose.yml with service stubs for ha-core,
   client-app, and operator-app
6. Create package.json files for each package with correct dependencies
7. Create the .claude/ folder with settings.json containing the three
   core hooks below
8. Confirm the structure is in place before we begin building ha-core

Do not begin writing application logic until the structure is confirmed.
Wait for my approval after step 8.

HOOKS TO CREATE IN .claude/settings.json

These run deterministically on every file change -- Claude cannot forget
or skip them.

Hook 1 -- Auto-format after every file edit (PostToolUse):
Runs Prettier on any JS/JSX file Claude writes or edits. Keeps code
style consistent without prompting for it each time.

Hook 2 -- Block writes to sensitive paths (PreToolUse):
Blocks any write to client.config.json, .env, or config.json during
active build stages unless explicitly approved. Prevents Claude from
accidentally overwriting client-specific config.

Hook 3 -- Stop gate (Stop):
Before ending a turn, confirms the stage test has been run and output
has been shown. Blocks completion if no test evidence exists in the
session. This enforces the "show evidence, not assertions" rule
automatically.

---

## SECTION 2 — STAGED BUILD SEQUENCE

Paste each stage prompt individually after the previous stage is confirmed working.

Before pasting each stage prompt, press Shift+Tab to enter plan mode.
Claude will propose its implementation approach and wait for your approval
before writing any files. Only approve and proceed once the plan looks right.

For Stage 5 onwards (client-app components), use a subagent for exploration
to protect your main context window. Prompt: "Use a subagent to read the
current ha-core entity structure and report back before we build any
components." The subagent reads files in its own context and returns only
the findings -- not hundreds of tokens of raw file content.

---

### MCP MANAGEMENT — ACTIVATE AND DEACTIVATE PER STAGE

MCP tool descriptions sit in the context window every turn. Running all
MCPs simultaneously adds 4-6k tokens per request before you have asked
anything. Only activate the MCP you need for the current stage, then
deactivate it before moving to the next.

Commands:

    claude mcp add hass-mcp        activate HA connection
    claude mcp remove hass-mcp     deactivate when done
    claude mcp add github          activate GitHub
    claude mcp remove github       deactivate when done
    claude mcp list                confirm what is currently active

Rule: never run more than 2 MCPs simultaneously. Filesystem MCP can
stay active throughout since it is scoped to the project folder only
and costs minimal tokens.

MCP schedule per stage:

Stage 0  -- Filesystem only. No HA MCP yet -- the spike is throwaway
            and does not need it.

Stage 1  -- Filesystem + hass-mcp. Activate hass-mcp to validate the
            WebSocket connection against your real running HA instance.
            Deactivate hass-mcp when Stage 1 test passes.

Stage 2  -- Filesystem + hass-mcp. Reactivate hass-mcp to test entity
            normalisation against real HA entity shapes. This is the
            most important stage for real data validation -- do not
            skip hass-mcp here. Deactivate when Stage 2 test passes.

Stage 3  -- Filesystem only. REST API and Express server can be tested
            with curl or Postman without MCP overhead.

Stage 3.5 -- Filesystem + hass-mcp. Reactivate to validate the backup
             trigger hits HA's snapshot API correctly. Deactivate after.

Stage 4  -- Filesystem only. Config system and app shell need no live
            HA connection. Keep context lean for the React foundation.

Stage 5  -- Filesystem only. Component building is the most
            token-intensive stage. No MCPs beyond filesystem. Use a
            subagent for any ha-core structure lookups rather than
            loading hass-mcp into the main context.

Stage 6  -- Filesystem only. Scenes are config-driven, no live HA
            needed for the build. Test manually via the running app.

Stage 6.5 -- Filesystem + github. Activate GitHub MCP to commit the
             auth layer as a tagged release before proceeding. Auth is
             the highest-risk stage -- a clean commit point here means
             you can roll back safely if Stage 7 breaks something.
             Deactivate GitHub MCP after commit.

Stage 7  -- Filesystem + hass-mcp. Camera feeds route through HA's
            camera proxy. Activate hass-mcp to validate the Frigate
            entity structure and camera feed URLs. Deactivate after.

Stage 7.5 -- Filesystem only. Push notification pipeline is tested
             end to end via the running app, not via MCP.

Stage 8  -- Filesystem + hass-mcp. Operator dashboard reads live
            health from ha-core which connects to HA. Activate to
            validate the health and history endpoints against a real
            site. Deactivate after.

Stage 9  -- Filesystem only. White-label validation is config file
            swapping -- no live HA needed.

Stage 10 -- Filesystem + github. Activate GitHub MCP to tag the
            production release and push the final docker-compose
            configuration. Deactivate after.

Stage 11 -- Filesystem + hass-mcp + github. Final stage where all
            three tools are genuinely needed simultaneously:
            hass-mcp validates the provisioning script connects
            correctly, github commits the provisioning tooling.
            This is the one exception to the two-MCP rule -- three
            is acceptable here because the stage is well-defined
            and short.

---

### STAGE 0 -- End-to-end spike (build, then throw away)

Before building anything properly, prove the full path works: one real
light, controllable from a browser, through all three conceptual layers.
This is deliberately ugly and hardcoded. Its only job is to de-risk the
architecture before we commit to it.

Requirements:
- A single throwaway Node script that connects to your real HA WebSocket,
  reads the state of one specific light entity, and exposes two HTTP
  endpoints: one to read its state, one to toggle it
- A single throwaway HTML page with one button that reads the state and
  toggles the light through that script
- Hardcode everything. No config files, no abstraction, no structure.

Goal: confirm the HA token works, the WebSocket connects, a service call
actually changes a real device, and the round trip (command -> HA ->
state update -> browser) works end to end.

When it works: commit it to a throwaway branch called spike, then delete
it from main. Do NOT build on top of it. We now know the full path works
and can build each layer properly with confidence.

Test: click the button, watch the real light change, see the new state
reflected in the page.

---

### STAGE 1 -- ha-core: WebSocket connection

Build the HA WebSocket client in ha-core/src/ws-client.js.

Requirements:
- Connects to HA WebSocket API at the URL in config.json
- Authenticates using a long-lived HA access token
- Implements reconnection with exponential backoff (max 30 second retry)
- Emits events: connected, disconnected, state_changed, error
- Subscribes to HA state_changed events on connect
- Maintains a local entity state cache (Map)
- Exposes: getState(entityId), getAllStates(), subscribe(callback)

Test: connect to a running HA instance and log 5 state_changed events to
confirm the stream is live. Do not proceed until this test passes.

---

### STAGE 2 -- ha-core: Entity normalisation

Build ha-core/src/entities.js.

Requirements:
- Normalises raw HA entity objects into clean internal format:
  { id, domain, name, state, attributes, lastChanged }
- Handles domains: light, switch, sensor, binary_sensor, climate,
  camera, lock, media_player, scene
- Exposes: normaliseEntity(raw), getEntitiesByDomain(domain),
  getEntitiesByRoom(roomId) -- room mapping comes from client.config.json
- Filters out internal HA entities (entity_id starting with group.,
  automation., script.) unless explicitly whitelisted

Test: log normalised entities by domain after connecting. Confirm structure
matches the internal format before proceeding.

---

### STAGE 3 -- ha-core: REST API and Express server

Build ha-core/src/api.js and ha-core/src/index.js.

Requirements:
- Express server on port 3001
- REST endpoints:
  GET  /entities                  all normalised entities
  GET  /entities/:domain          entities by domain
  GET  /entities/:id              single entity state
  POST /services/:domain/:service call HA service (e.g. light.turn_on)
  GET  /rooms                     room list from client.config.json
  GET  /rooms/:id/entities        entities assigned to a room
  POST /scenes/:sceneId           trigger a named scene
  GET  /health                    uptime, HA connection status, entity count
- SSE endpoint at /events -- streams state_changed events to client-app
  browsers. This is the decided browser transport. Do NOT build a
  WebSocket passthrough to the browser -- SSE is more reliable through
  Cloudflare Tunnel and simpler to implement correctly.
- CORS enabled for client-app origin
- Request logging middleware

Test: hit /health and /entities from Postman or curl. Confirm response
structure before proceeding to client-app.

---

### STAGE 3.5 -- ha-core: Persistence layer

Add lightweight persistent storage to ha-core using SQLite, and wire up
the Backblaze B2 backup pipeline.

Why: the operator-app needs history, not just current state. "Last went
offline", "offline frequency", and "last backup timestamp" all require
stored data that real-time HA state cannot provide. Backblaze B2 is also
set up here because it depends on ha-core running -- back up everything
from the same service that knows system state.

Requirements:
- SQLite database in ha-core (better-sqlite3 or similar)
- Tables:
  - site_events (timestamp, event_type, detail) -- connection up/down,
    HA restarts, backup completions, update events
  - device_history (entity_id, state, timestamp) -- sampled, not every
    state change; record availability transitions and key state changes
- Record events automatically from the WebSocket event stream
- Expose REST endpoints:
  GET /history/events?since=     site events since a timestamp
  GET /history/uptime            connection uptime summary
  GET /history/device/:id        availability history for one device
  GET /history/backups           backup history and last success timestamp
- Prune history older than 90 days automatically (configurable)
- Nightly backup job (node-cron or similar):
  - Triggers HA snapshot via REST API
  - Waits for snapshot completion
  - Rsyncs HA snapshot + ha-core SQLite database + all config files to
    Backblaze B2 bucket (encrypted via SOPS key before upload)
  - Records backup completion event in site_events table
  - Credentials for Backblaze come from SOPS-encrypted secrets, never
    plain .env files
- Camera event clips (from Frigate via HA) synced to a separate B2
  bucket on a rolling 90-day retention

Test: trigger a manual backup via a /backup/run endpoint, confirm the
files appear in B2 and the completion event is recorded in site_events.

---

### STAGE 4 -- client-app: Foundation and config system

Build the client-app foundation.

Requirements:
- Vite + React project
- Tailwind CSS with a custom dark theme
- client.config.json reader that exposes: clientName, logoUrl,
  primaryColour, rooms (array of { id, name, icon, entityIds })
- CSS variables driven by primaryColour from config
- PWA manifest and service worker stub (offline shell)
- useHA custom hook:
  - Connects to ha-core SSE endpoint at /events for real-time state
    updates (not WebSocket -- SSE is the decided browser transport)
  - Sends commands to ha-core via REST (not over the SSE connection)
  - Maintains real-time entity state in Zustand store
  - Exposes: getEntity(id), callService(domain, service, data),
    triggerScene(sceneId), connectionStatus
- App shell: bottom navigation (Rooms, Scenes, Cameras, Settings),
  dark background, client logo in header

Aesthetic direction: dark editorial. Think a well-designed iOS app.
Not an admin dashboard. Primary colour from config as the only accent.
Monospace or geometric sans typography. Tight, purposeful spacing.

Test: render the app shell with a placeholder room list pulled from
client.config.json. Confirm config system works before building room views.

---

### STAGE 5 -- client-app: Room and device views

Build room navigation and device control components.

Room view requirements:
- Grid of device cards for the room
- Each card shows: device name, current state, primary action toggle
- Smooth state transitions when state_changed events arrive

Device components (one per domain):
- LightCard: on/off toggle, brightness slider if supported, colour temp
  if supported
- ClimateCard: current temp, target temp, mode selector
- LockCard: locked/unlocked state, lock/unlock button with confirm step
- SensorCard: value display, unit, last updated
- SwitchCard: on/off toggle
- MediaCard: play/pause, volume, current track if available

All components must:
- Read state from useHA context (never fetch directly)
- Call services via useHA callService
- Handle unavailable state gracefully (greyed out, not broken)
- Animate state changes with a subtle transition

Test: control a real light through the UI. Confirm state updates in real
time after the command.

---

### STAGE 6 -- client-app: Scenes

Build the Scenes view.

Requirements:
- Scene cards: Morning, Away, Evening, Movie, Sleep (configurable in
  client.config.json)
- Each scene has: name, icon, description, sceneId (maps to HA scene
  entity or script)
- Tap triggers the scene via ha-core POST /scenes/:sceneId
- Active scene highlighted if determinable from entity state
- Scenes view accessible from bottom navigation

Test: trigger a scene from the UI and confirm HA executes it.

---

### STAGE 6.5 -- Authentication (do this before cameras)

Add authentication across both apps. This must exist before the camera
view, because the system controls door locks and shows camera feeds --
unauthenticated access is not acceptable.

Requirements:
- ha-core is the authentication authority. It issues and validates session
  tokens (JWT or signed session). Auth is independent of Home Assistant.
- Do NOT authenticate clients against HA's own auth system. The client must
  never know HA exists, auth must survive a future backend change, and the
  operator model needs one consistent auth approach across all sites.
  ha-core authenticates to HA internally with a long-lived token the
  client never sees.
- client-app:
  - Primary auth: username/password account, issued and validated by
    ha-core, persisted across reloads via a secure cookie (not the raw
    token in localStorage)
  - Convenience layer: optional PIN unlock on a trusted device after the
    initial password login (the account is the source of truth, the PIN
    is just a fast re-entry on a known device)
  - All ha-core requests carry the auth token; ha-core rejects
    unauthenticated requests
  - Auto-logout after a configurable idle period
- operator-app:
  - Separate, stronger auth tier (this is the integrator control plane)
  - Operator credentials never shared with client credentials
- ha-core:
  - Reject all /services and /scenes calls without a valid token
  - Read-only endpoints may stay open on local network only if behind
    Tailscale, but document this decision explicitly

Security note: client HA tokens and auth secrets are stored in the
SOPS-encrypted secrets file for the site. They are never committed to
git, never put in client.config.json, and never passed as plain
environment variables outside of the decrypted runtime context.

Test: confirm an unauthenticated request to POST /services is rejected,
and an authenticated one succeeds.

---

### STAGE 7 -- client-app: Camera view

Build the Camera view.

Requirements:
- Grid of camera feeds using HA camera proxy endpoint via ha-core
- Tap to fullscreen a feed
- Last motion detection event shown per camera (from Frigate via HA)
- Frigate person detection alerts surfaced as a notification badge
- Handles cameras being offline gracefully

Note: Use MJPEG stream from HA camera proxy. Do not attempt WebRTC
at this stage.

Known future task (do not solve now, just record it): multi-camera MJPEG
is bandwidth-heavy over Tailscale. At a client site with 4+ cameras this
will not hold up. Revisit with go2rtc/WebRTC once the system works locally.
Add this to FUNCTIONALITY.md as a known limitation so it does not surprise
us at a client site.

Test: display at least one live camera feed in the UI.

---

### STAGE 7.5 -- Push notification pipeline

Build the actual notification delivery mechanism. The security value
proposition depends on the client receiving an alert when a person is
detected -- a badge inside a closed app is not enough.

Requirements:
- Web Push via the client-app service worker (VAPID keys)
- ha-core subscribes to Frigate person-detection events from HA and
  pushes a notification to registered client devices
- Notification payload: camera name, detection type, timestamp, and a
  thumbnail if available
- Tapping the notification opens the relevant camera in the client-app
- Client can enable/disable notification categories in settings
  (person detection, door/window opened, system offline)
- Graceful fallback: if Web Push is unavailable on the device, document
  the HA companion app as the alternative delivery channel

Note: iOS Web Push requires the PWA to be installed to the home screen.
Document this in the client onboarding notes -- it affects how you set
up the client's phone during handover.

Test: trigger a person detection in Frigate (or simulate the HA event)
and confirm a push notification arrives on a registered device.

---

### STAGE 8 -- operator-app: Site dashboard

Build the operator-app management dashboard.

Requirements:
- Lists all managed client sites (configured in operator-app/sites.json:
  array of { siteId, clientName, tailscaleHostname, haVersion, updateGroup })
- Per site card shows:
  - Online/offline status (ping ha-core /health)
  - Entity count
  - Last backup timestamp (read from ha-core /history/events)
  - Any offline devices (entities with state = unavailable)
  - HA version and whether an update is available
  - Update group (canary / wave-1 / main)
- Alert feed: cross-site list of offline devices sorted by recency
- Update management panel:
  - Shows current HA version across all sites
  - Allows pushing an update to a specific group (canary, wave-1, main)
  - 48hr hold enforced between wave-1 and main rollout
  - Failed update triggers automatic rollback to last Backblaze snapshot
  - Update history log per site
- Tap a site card to see full entity list for that site
- Auto-refreshes every 60 seconds

Aesthetic: same dark editorial direction as client-app but with more
data density. Operator-grade, not consumer-grade.

Test: display health status for at least one real site.

---

### STAGE 9 -- White-label validation

Validate the white-label system end to end.

Create two different client.config.json profiles:
- Client A: "Thornbury Residence", green accent, 4 rooms
- Client B: "Brighton Home", navy accent, 3 rooms

Confirm that switching configs changes: logo area text, primary colour
throughout the UI, room list, and entity assignments.

No code changes should be required between clients -- config only.

Document the white-label setup process in a WHITELABEL.md file that a
future integrator licensee could follow independently.

---

### STAGE 10 -- Production Docker Compose and documentation

Finalise deployment configuration.

Requirements:
- docker-compose.yml with:
  - ha-core service (port 3001)
  - client-app service (port 3000, served via nginx)
  - operator-app service (port 3002, served via nginx)
  - Shared network
  - Volume mounts for config files and logs
  - Restart policy: unless-stopped
- .env.example with all required environment variables documented
- Per-package README covering: setup, config variables, deployment,
  backup procedure, update procedure
- Update FUNCTIONALITY.md to reflect the complete built system
- Update PROGRESS.md as final session summary

Test: docker compose up from a clean checkout and confirm all three
services are accessible.

---

### STAGE 11 -- Site provisioning workflow

Build the repeatable process for onboarding a new client site. This is
the thing done on every job, so it must be designed, not improvised
on site.

Requirements:
- A provisioning script or guided CLI in ha-core that:
  - Prompts for site details (client name, site ID, HA URL, update group:
    canary / wave-1 / main)
  - Validates the HA connection and token before proceeding
  - Pulls the live entity list from HA
  - Walks through assigning entities to rooms (the tedious, error-prone
    part) and writes the result to client.config.json
  - Generates SOPS-encrypted secrets file for the site (HA token,
    Backblaze credentials, Cloudflare tunnel token, ha-core auth secret)
  - Creates the Backblaze B2 buckets for this site (config backup and
    camera clips) and confirms write access
  - Registers the new site in the operator-app sites.json with update
    group assigned
  - Runs the whitelabel-check before completion
- Cloudflare Tunnel setup per site, documented step by step:
  - Install cloudflared on the client box, authenticate, create a named
    tunnel for the site, route the client-app hostname through it
  - This is what gives the client frictionless away-from-home access with
    no open router ports
  - Record the tunnel name and hostname in the site record
- Tailscale enrolment of the box onto the operator tailnet for support
  access (separate from the client tunnel above)
- Output: a complete, valid client.config.json, SOPS-encrypted secrets,
  working B2 buckets, a working client tunnel, and operator Tailscale
  access -- with no hand-editing of JSON or credentials required
- A PROVISIONING.md document describing the end-to-end on-site process,
  written so your electrician co-founder could follow it without you

Test: provision a fresh mock site end to end and confirm the generated
client.config.json loads correctly in the client-app.

---

## SKILLS TO BUILD (add progressively, not upfront)

Skills live in .claude/skills/ and load on demand -- they do not bloat
every session. Build each skill after you have completed the relevant
stage so the skill encodes real knowledge, not assumptions.

SKILL 1 -- ha-automation (build after Stage 3)
Encodes standard HA automation YAML patterns: presence-based lighting,
climate pre-conditioning, Frigate alert routing. Invoke with /ha-automation.
Stops you re-explaining these patterns every session.

SKILL 2 -- client-config (build after Stage 4)
Takes a room list and device inventory and outputs a valid
client.config.json. Invoke with /client-config. Makes new client
onboarding a guided process rather than manual JSON editing.

SKILL 3 -- whitelabel-check (build after Stage 9)
Scans all source files for hardcoded brand references (colour hex codes,
client names, logo paths) before a client deployment. Invoke with
/whitelabel-check. Catches the error before it reaches a client site.

SKILL 4 -- frigate-config (build after Stage 7)
Generates standard Frigate camera config including zones, masks, and
detection thresholds per camera type. Invoke with /frigate-config.
Encodes your camera placement best practices.

GRAPHIFY TRIGGER

When your file count crosses 100 files (roughly Stage 5-6), install
Graphify (github.com/safishamsi/graphify). Run it once at project root
to build the knowledge graph. From that point Claude navigates by graph
lookup rather than file-by-file reading. Install signal: you notice
Claude running multiple Glob and Grep calls just to orient itself at
the start of a session.

---

## RECOVERY PROMPT

If something breaks mid-build, paste this into Claude Code:

Something went wrong. Before fixing anything, tell me:
1. Which file was last successfully written
2. What the exact error is
3. Which rule in CLAUDE.md is relevant to this error

Propose a fix and wait for my approval before changing any code.
Do not refactor anything outside the scope of the fix.

---

## CONTEXT RESET PROMPT

When context fills, start a new Claude Code session and paste this:

Continuing the smarthome-platform project. Before doing anything else:
1. Run claude mcp list and tell me what MCPs are currently active
2. Read CLAUDE.md, FUNCTIONALITY.md, and PROGRESS.md
3. Confirm what has been built, what is in progress, and what comes next
4. Check the MCP schedule for the current stage and deactivate any
   MCPs not on the schedule before proceeding

Enter plan mode (Shift+Tab) and propose the next step before writing
any code. Wait for my confirmation before proceeding.
