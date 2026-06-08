# Session State

This file is updated automatically at every checkpoint and stage
completion. If starting a new session, read this file first.

## Current stage
Stage 3 (REST API and Express server) -- COMPLETE

## Last completed
Stage 3: Express server on :3001 with all REST endpoints, SSE /events stream,
and /health. ws-client extended with callService + connected getter. createRouter
injectable -- 47/47 tests pass. Live smoke test confirmed. Committed on
stage-1-ws-client (e0b4f98).

## In progress
Nothing.

## Next action
Decision pending: Stage 3.5 (SQLite persistence + Backblaze B2 backup) or
skip to Stage 4 (client-app foundation). User to decide.

If Stage 3.5: build ha-core SQLite tables (site_events, device_history),
record WS events, history endpoints, nightly B2 backup via node-cron + SOPS.
MCP: Filesystem only. Model: Sonnet 4.6. Effort: high.

If Stage 4: build client-app Vite+React+Tailwind foundation, useHA hook
(SSE + REST), client.config.json reader, PWA manifest, app shell with
bottom nav. MCP: Filesystem only. Model: Sonnet 4.6. Effort: high.

## Open decisions
- Branch stage-1-ws-client now holds Stages 1-3 -- rename to ha-core-foundation
  if desired before merging, or leave as-is.
- ha-mcp restored in ~/.claude.json but requires Claude Code restart to load.
  Not needed until Stage 7.

## Last commit
stage-1-ws-client: e0b4f98 feat(ha-core): Stage 3 -- REST API, SSE endpoint

## Context reset prompt location
onboarding/staff/CLAUDE_CODE_WORKFLOW.md
