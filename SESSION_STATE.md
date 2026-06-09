# Session State

This file is updated automatically at every checkpoint and stage
completion. If starting a new session, read this file first.

## Current stage
Stage 6 complete — next is Stage 6.5 (authentication)

## Last completed
LightTile mobile polish (temp slider value prop fix, close button 44px touch
target) + Stage 6 scenes tab (SceneTile, SceneList, App.jsx wiring, 5 tests).
124 client-app unit tests passing.

## In progress
Nothing -- clean stopping point.

## Next action
Stage 6.5: Authentication (ha-core JWT, username/password, PIN convenience layer).
Switch to Opus 4.8 + xhigh effort before starting.

## Open decisions
None.

## Branch state
- main: 42fa2e7 (ha-core Stages 1-3.5)
- stage-4-client-app: 143a340 (Stage 4 complete)
- stage-5-room-detail: HEAD (Stage 5, Stage 5.5 home screen, dev tooling complete)
- stage-1-ws-client: old branch, safe to delete
- spike: throwaway, safe to delete

## Model for next session
claude-opus-4-8 (Stage 6.5 auth requires Opus)

## Effort for next session
xhigh

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
