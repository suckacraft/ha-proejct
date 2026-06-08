# Session State

This file is updated automatically at every checkpoint and stage
completion. If starting a new session, read this file first.

## Current stage
Stage 3.5 (persistence and backup) -- COMPLETE

## Last completed
Stage 3.5: SQLite persistence (site_events + device_history), /history/*
endpoints, /backup/run, nightly backup + prune crons. 65/65 tests pass.
Live run confirmed HA snapshot triggered and backup_completed event in DB.
Committed on stage-1-ws-client (276b91f).

## In progress
Nothing.

## Next action
Stage 4: client-app foundation.
Build packages/client-app/src with: Vite+React+Tailwind, client.config.json
reader (clientName, logoUrl, colours, rooms), useHA custom hook (SSE consumer
for real-time state + REST for commands), Zustand entity store, PWA manifest +
service worker stub, app shell with bottom nav (Rooms, Scenes, Cameras,
Settings), dark editorial aesthetic, primary colour from config as CSS variable.
Test: render app shell with placeholder room list from client.config.json.
MCP: Filesystem only. Model: Sonnet 4.6. Effort: high.

## Open decisions
- Branch stage-1-ws-client holds Stages 1-3.5. Merge to main before Stage 4,
  or continue on branch. Recommend merging now -- ha-core is complete.
- B2 credentials (B2_APPLICATION_KEY_ID/KEY/BUCKET/ENDPOINT) wired via
  SOPS-decrypted env vars; provisioned in Stage 11.
- Camera clip sync to B2 deferred to after Stage 7 (Frigate).
- ha-mcp active in ~/.claude.json but needs Claude Code restart to load.

## Last commit
stage-1-ws-client: 276b91f feat(ha-core): Stage 3.5 -- SQLite persistence

## Context reset prompt location
onboarding/staff/CLAUDE_CODE_WORKFLOW.md
