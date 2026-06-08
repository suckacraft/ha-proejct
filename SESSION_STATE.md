# Session State

This file is updated automatically at every checkpoint and stage
completion. If starting a new session, read this file first.

## Current stage
LightTile mobile polish (pre-Stage 6)

## Last completed
Full dev tooling suite + management dashboard + provisioning device discovery
protocol. All dev scripts stable. No application logic changed this session.

## In progress
Nothing -- clean stopping point.

## Next action
LightTile mobile polish at 375px viewport, then Stage 6 (scenes tab).

## Open decisions
None.

## Branch state
- main: 42fa2e7 (ha-core Stages 1-3.5)
- stage-4-client-app: 143a340 (Stage 4 complete)
- stage-5-room-detail: HEAD (Stage 5, Stage 5.5 home screen, dev tooling complete)
- stage-1-ws-client: old branch, safe to delete
- spike: throwaway, safe to delete

## Model for next session
claude-sonnet-4-6

## Effort for next session
high

## IMPORTANT for new session
- NO postcss.config.js — deleted. @tailwindcss/vite handles everything.
- NO tailwind.config.js — deleted. Tailwind 4 CSS-first config.
- callService is src/lib/callService.js (standalone, NOT in useHA)
- useHA is SSE-only — no return value
- TILE_MAP in src/components/devices/index.js — extend here to add tile types
- Vite proxy strips /api prefix before forwarding to ha-core port 3001
- client.config.json write-protect hook active
- LightTile uses hs_color (HA API param) not hsColor (normalised attribute)
- Temperature slider fires color_temp_kelvin (not mireds)
- Default route is /home (HomeScreen), not /rooms
- BottomNav has 5 tabs: Home, Rooms, Scenes, Cameras, Settings
- HomeScreen receives: rooms, scenes, clientName, firstName props from App.jsx

## Context reset prompt location
onboarding/staff/CLAUDE_CODE_WORKFLOW.md
