# Session State

This file is updated automatically at every checkpoint and stage
completion. If starting a new session, read this file first.

## Current stage
Stage 2 (entity normalisation) -- COMPLETE

## Last completed
Stage 2: entities.js normalises 118 real HA entities into clean internal
envelope { id, domain, name, state, attributes, lastChanged }. 9 product
domains get curated camelCase contracts; 29 others pass through. 32 regression
tests pass against real captured fixtures. Live run confirmed across 38 domains
with zero internal entity leakage. Committed on stage-1-ws-client (3c472e2).

## In progress
Nothing.

## Next action
Stage 3: build packages/ha-core/src/api.js and packages/ha-core/src/index.js.
Express server on port 3001. REST endpoints: GET /entities, GET /entities/:domain,
GET /entities/:id, POST /services/:domain/:service, GET /rooms,
GET /rooms/:id/entities, POST /scenes/:sceneId, GET /health.
SSE endpoint at /events (browser transport -- NOT WebSocket passthrough).
Wire ws-client + entities together. Inject room config from client.config.json.
MCP schedule: Filesystem only (no hass-mcp needed for Stage 3).
Model: Sonnet 4.6. Effort: high.

## Open decisions
- stage-1-ws-client branch holds both Stage 1 and Stage 2 -- rename optional,
  not required. Ask user if desired.
- ha-mcp restored in ~/.claude.json but requires Claude Code restart to load.
  Not needed until Stage 7 (camera feeds).

## Last commit
stage-1-ws-client: 3c472e2 feat(ha-core): Stage 2 -- entity normalisation

## Context reset prompt location
onboarding/staff/CLAUDE_CODE_WORKFLOW.md
