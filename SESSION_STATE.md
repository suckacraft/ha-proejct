# Session State

This file is updated automatically at every checkpoint and stage
completion. If starting a new session, read this file first.

## Current stage
LightTile colour enhancement (pre-Stage 6) -- IN PROGRESS

## Last completed
Stage 5 complete (branch: stage-5-room-detail, commit 1aa88e7).
SSE real-time sync confirmed working. 55 client-app + 68 ha-core tests.

## In progress
LightTile full colour control enhancement (Part 1 of 3-part sequence):
- LightTile.jsx: REWRITTEN with full colour mode support (committed in wip checkpoint)
- LightTile.test.jsx: OLD tests still in place -- must be replaced with comprehensive suite
- client.config.json: minor update (also in wip checkpoint)

### What LightTile.jsx now does:
- resolveMode() returns: "onoff" | "brightness" | "color_temp" | "hs" | "combo"
- combo = both color_temp and hs/rgb in supportedColorModes
- Edge case: empty modes + brightnessPct !== null → "brightness" (under-reporting devices)
- PRESETS: 9 swatches (Warm White, Cool White, Red, Orange, Yellow, Green, Blue, Purple, Pink)
- allSwatches = [...favourites.map(...), ...PRESETS] — favourites first
- Temperature slider: warm→cool gradient inline style
- Colour swatches: scrollable row, 44px touch targets, active ring highlight
- Custom picker: hue + saturation sliders, onPointerUp fires callService
- colourOpen: expand/collapse swatches on combo lights (▼/▲ button)
- Props: entity, favourites=[]

### What still needs doing this session:
1. Replace LightTile.test.jsx with comprehensive suite (all 5 modes + edge cases)
2. Run vitest — confirm all tests pass
3. Commit 1: "enhance: LightTile full colour and temperature control"
4. ADD FUTURE ARCHITECTURE CONTEXT section to CLAUDE.md (user requested)
5. Tell user to type /model claude-opus-4-8 then /effort xhigh for Part 2
6. Part 2: ha-core preferences API (SQLite + GET/POST /api/preferences/:key)
7. Part 3: Client-side favourites + room defaults (after Opus, back to Sonnet)

## Next action
Resume: write LightTile.test.jsx with full test suite.
Then: add FUTURE ARCHITECTURE CONTEXT to CLAUDE.md.
Then: commit 1 + model switch prompt for Part 2.

## IMPORTANT for new session:
- NO postcss.config.js — deleted. @tailwindcss/vite handles everything.
- NO tailwind.config.js — deleted. Tailwind 4 uses CSS-first config.
- callService is src/lib/callService.js (standalone function, NOT in useHA)
- useHA is SSE-only — no return value
- TILE_MAP in src/components/devices/index.js — extend here to add new tile types
- Vite proxy strips /api prefix before forwarding to ha-core port 3001
- client.config.json write-protect hook active
- LightTile.jsx uses hs_color (HA API param) not hsColor (normalized attribute name)
- Temperature slider fires color_temp_kelvin (not mireds)
- tapSwatch: uses color_temp_kelvin if mode !== "hs" AND swatch.colorTemp exists

## Branch state
- main: 42fa2e7 (ha-core Stages 1-3.5)
- stage-4-client-app: 143a340 (Stage 4 complete)
- stage-5-room-detail: HEAD (Stage 5 + LightTile wip)
- stage-1-ws-client: old feature branch, safe to delete
- spike: throwaway, safe to delete

## Context reset prompt location
onboarding/staff/CLAUDE_CODE_WORKFLOW.md
