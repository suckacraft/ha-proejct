# Session State

This file is updated automatically at every checkpoint and stage
completion. If starting a new session, read this file first.

## Current stage
Stage 5 (room detail + entity tiles) -- COMPLETE

## Last completed
Stage 5 complete. Branch stage-5-room-detail:
- react-router-dom 7.17.0: URL-based navigation (/rooms, /rooms/:id, /scenes, /cameras, /settings)
- BrowserRouter wraps App; AppContent inner component uses useLocation/useNavigate
- BottomNav: NavLink-based (no props); Header: onBack prop → useNavigate(-1) on room detail
- RoomList: Link-wrapped cards → /rooms/:id
- RoomDetail: useParams + TILE_MAP registry dispatch + SkeletonTile for unloaded entities
- LightTile (toggle + brightness slider), SwitchTile (toggle), SensorTile (value + unit),
  ClimateTile (±1° buttons, HVAC badge), FallbackTile (read-only fallback)
- callService: standalone function in src/lib/; throws on non-ok; no hook wrapper
- useHA: simplified to SSE-only (callService extracted)
- 53 client-app tests pass; 68 ha-core tests pass (121 total)

## In progress
Nothing.

## Next action
Stage 6: scenes tab + scene trigger UI.
Files to build/modify:
- src/components/scenes/SceneList.jsx (scene cards, trigger via callService scene.turn_on)
- src/components/scenes/SceneTile.jsx (name, icon placeholder, tap-to-activate)
- Route /scenes already exists as placeholder — replace with SceneList
- Scenes data already in client.config.json (id, name, icon, sceneId)
MCP: Filesystem only. Model: Sonnet 4.6. Effort: high.

IMPORTANT for new session:
- NO postcss.config.js — deleted. @tailwindcss/vite handles everything.
- NO tailwind.config.js — deleted. Tailwind 4 uses CSS-first config.
- callService is src/lib/callService.js (standalone function, NOT in useHA)
- useHA is SSE-only — no return value
- TILE_MAP in src/components/devices/index.js — extend here to add new tile types
- Vite proxy strips /api prefix before forwarding to ha-core port 3001
- client.config.json write-protect hook active

## Branch state
- main: 42fa2e7 (ha-core Stages 1-3.5)
- stage-4-client-app: 143a340 (Stage 4 complete)
- stage-5-room-detail: HEAD (Stage 5 complete)
- stage-1-ws-client: old feature branch, safe to delete
- spike: throwaway, safe to delete

## Context reset prompt location
onboarding/staff/CLAUDE_CODE_WORKFLOW.md
