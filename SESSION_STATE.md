# Session State

This file is updated automatically at every checkpoint and stage
completion. If starting a new session, read this file first.

## Current stage
Pre-Stage 6 UI polish — COMPLETE. Ready to start Stage 6.

## Last completed
Colour sheet UX improvements (commit `029f02f`).
All pre-Stage 6 work done. 119 client-app + 84 ha-core tests passing.

## In progress
LightTile UI mobile polish -- minor refinement of the mobile interaction detail
(bottom sheet sizing, 3x3 swatch grid, 48px touch targets) on already-committed
colour control. Non-blocking. Otherwise clean -- ready to start Stage 6.

## Next action
Start Stage 6: SSE reconnect handling + disconnect UI state in client-app.
- EventSource error → reconnect with exponential backoff
- UI state for "disconnected" (dim overlay or banner)
- Also: SSE error handler in useHA.js
Model: claude-sonnet-4-6. Effort: high.

## Open decisions
- `client.config.json` has no `"firstName"` field — write-protect hook blocks edits.
  HomeScreen falls back to "there" (e.g. "Good evening, there").
  User must add it manually or explicitly approve the Edit tool call.
- Stage 6.5 (authentication) needs Opus 4.8 + xhigh effort when reached.
  Do NOT start 6.5 on Sonnet.

## Branch state
- main: 42fa2e7 (ha-core Stages 1-3.5)
- stage-4-client-app: 143a340 (Stage 4 complete)
- stage-5-room-detail: HEAD `2801685` (Stage 5, Stage 5.5 home screen, pre-Stage 6 polish)
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
