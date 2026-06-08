# Session State

This file is updated automatically at every checkpoint and stage
completion. If starting a new session, read this file first.

## Current stage
Stage 4 (client-app foundation) -- COMPLETE, browser confirmed working

## Last completed
Stage 4 complete. Branch stage-4-client-app, HEAD 143a340:
- loadConfig() + runtime CSS var white-label injection (--color-primary)
- Zustand entity store (Map, setEntity, removeEntity)
- useHA hook (EventSource /api/events, callService POST)
- App shell: Header, BottomNav (tab state), RoomList (2-col dark grid)
- PWA: vite-plugin-pwa manifest + @tailwindcss/vite v4 migration
- Vite proxy /api → localhost:3001 (prefix stripped)
- ha-core: wireEvents exported+injectable, normalises before SSE broadcast
- PostCSS fix: postcss.config.js deleted -- conflicts with @tailwindcss/vite
- 81 tests pass (68 ha-core + 13 client-app)

## In progress
Nothing.

## Next action
Stage 5: room detail view + entity tiles (lights, switches, sensors, climate).
Files to build:
- src/components/rooms/RoomDetail.jsx (room page, entity list)
- src/components/devices/ (LightTile, SwitchTile, SensorTile, ClimateTile)
- Add react-router-dom for navigation (tab → room detail)
MCP: Filesystem only. Model: Sonnet 4.6. Effort: high.

IMPORTANT for new session:
- NO postcss.config.js -- deleted. @tailwindcss/vite handles everything.
- NO tailwind.config.js -- deleted. Tailwind 4 uses CSS-first config.
- Vite proxy strips /api prefix before forwarding to ha-core port 3001
- Tailwind 4: @theme defines --color-primary (compile fallback); loadConfig()
  overrides it at runtime via style.setProperty
- client.config.json write-protect hook active -- rooms must be added manually
- ha-mcp removed from MCP config (not needed until Stage 7)

## Branch state
- main: 42fa2e7 (ha-core Stages 1-3.5)
- stage-4-client-app: HEAD 143a340 (Stage 4 complete + PostCSS fix)
- stage-1-ws-client: old feature branch, safe to delete
- spike: throwaway, safe to delete

## Context reset prompt location
onboarding/staff/CLAUDE_CODE_WORKFLOW.md
