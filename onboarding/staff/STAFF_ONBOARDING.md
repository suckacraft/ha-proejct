# Staff Onboarding -- Smart Home Platform

Welcome to the team. This document gets you from zero to fully operational
on the smarthome-platform project. Work through it in order.

---

## Who this is for

- New developers joining the build team
- Electrician co-founders needing a dev environment for provisioning tools
- Future franchisee technical leads setting up their own environment

---

## Step 1 -- Dev environment setup

Run the setup script on a fresh Windows machine:

    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
    .\setup\setup-dev-environment.ps1

If anything fails, check setup/SETUP.md Known Issues section before debugging.

After the script completes, do the manual steps listed in the script output:
1. Complete HA setup wizard at http://localhost:8123
2. Restart HA: docker restart homeassistant
3. Generate HA token and update HASS_TOKEN in .claude.json
4. Add GitHub MCP with your personal GitHub token
5. Add Context7 MCP with your free API key from context7.com

---

## Step 2 -- Project orientation

Read these files in order before writing a single line of code:

1. CLAUDE.md -- Standing rules Claude Code follows on this project
2. FUNCTIONALITY.md -- What has already been built
3. PROGRESS.md -- Current state and what comes next
4. onboarding/staff/CLAUDE_CODE_WORKFLOW.md -- How we use Claude Code here
5. onboarding/staff/MCP_SCHEDULE.md -- Which MCPs to activate per stage

This takes about 20 minutes and saves hours of confusion.

---

## Step 3 -- Understand the architecture

The platform has three layers:

    ha-core        Node.js adapter between HA and the frontend
    client-app     React PWA -- what clients see and interact with
    operator-app   React dashboard -- what we use to manage all client sites

Key decisions already made (do not revisit without a team discussion):
- ha-core talks to HA over localhost
- Browser gets real-time updates via SSE, not WebSocket
- All credentials stored via SOPS encrypted secrets
- Client remote access via Cloudflare Tunnel (not Tailscale)
- Operator/support access via Tailscale (not Cloudflare Tunnel)
- Auth is handled by ha-core, never HA's own auth system
- State management is Zustand, never React Context for entity state
- All npm dependencies pinned to exact versions

---

## Step 4 -- Find the current stage and your first task

Stage 0 (the throwaway spike) is complete, along with ha-core (Stages 1-3.5)
and client-app through Stage 5.5. You are NOT starting from scratch.

To find where the build is right now, read SESSION_STATE.md first. It is updated
at every checkpoint and names the current stage, the next action, and the model
and effort to use.

Current state at the time of writing:
- Home screen dashboard (Stage 5.5) is delivered: /home is the default route.
- LightTile UI mobile polish is the one item still in progress.
- Next stage to build is Stage 6 (Scenes tab).

Open Claude Code from the project folder and run the context reset prompt from
onboarding/staff/CLAUDE_CODE_WORKFLOW.md before touching any code:

    cd C:\Users\USERNAME\smarthome-platform
    claude

You can still read the Stage 0 spike description in
docs/HA_PROJECT_KICKOFF_PROMPT.md to understand the end-to-end round trip, but do
not rebuild it -- it was throwaway by design.

---

## Step 5 -- Key conventions you must know

These reflect decisions already locked in. Violating them silently breaks things
or gets reverted in review.

Preferences API is the source of truth for ALL user preferences. Favourites, room
defaults, and home screen configuration live in ha-core via /api/preferences/:key.
There is NO localStorage anywhere in shared logic. This is what keeps the PWA, the
future React Native app, and the kiosk in sync. Read and write every preference
through /api/preferences/:key.

Adding a new device tile: add a component to src/components/devices/ and register
it in TILE_MAP in src/components/devices/index.js. That registry is the single
extension point -- there is no switch/if-else to touch.

Playwright on every frontend stage: all frontend stages now include Playwright
browser verification at a 375px mobile viewport, in addition to Vitest unit tests.
Before starting any frontend stage, install the browser once:

    npx playwright install chromium

Always restart ha-core after pulling commits. If ha-core keeps running old code
after a commit that touched ha-core/src/, SSE updates silently stop working (tiles
render initial state on load but never update live). Kill the running process and
restart it. See setup/SETUP.md Known Issues for the full root cause.

---

## Step 6 -- Ongoing workflow

See CLAUDE_CODE_WORKFLOW.md for the full session discipline.

Short version:
- Always run `claude mcp list` at the start of a session
- Always work from inside C:\Users\USERNAME\smarthome-platform
- Always end a session with "update PROGRESS.md before we stop"
- Always enter plan mode (Shift+Tab) before a new stage
- Never run more than 2 MCPs simultaneously (Stage 11 is the exception)

---

## Contacts

Technical lead: Josh
Electrician co-founder: [Name]
HA community: community.home-assistant.io
Project issues: [GitHub repo URL when created]
