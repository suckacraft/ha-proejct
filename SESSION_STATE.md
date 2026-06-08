# Session State

This file is updated automatically at every checkpoint and stage
completion. If starting a new session, read this file first.

## Current stage
Stage 1 (ha-core WebSocket client) -- COMPLETE

## Last completed
Stage 1: ws-client.js built and tested against live HA. Connects, authenticates,
subscribes to state_changed, populates entity cache via get_states, exposes
getState/getAllStates/subscribe. Exponential backoff reconnect (1s base, 30s cap).
4 integration tests passed -- 5 events in 2.5s. Committed on stage-1-ws-client
branch (56b8ae8).

## In progress
Nothing.

## Next action
Stage 2: build packages/ha-core/src/entities.js -- entity normalisation.
Normalises raw HA entity objects into { id, domain, name, state, attributes,
lastChanged }. Handles 9 domains. Exposes normaliseEntity(raw),
getEntitiesByDomain(domain), getEntitiesByRoom(roomId). Filters internal HA
entities. MCP schedule: Filesystem + hass-mcp.
IMPORTANT: Stage 2 requires Opus 4.8 + xhigh effort (data shape decisions
affect everything downstream). Tell user to type /model claude-opus-4-8
and /effort xhigh before proceeding.

## Open decisions
- spike/.ha-token and ha-key.txt deleted from working tree this session
  (both were gitignored). No rotation needed unless the spike HA token
  was shared or exposed outside this machine.

## Last commit
stage-1-ws-client: 56b8ae8 feat(ha-core): Stage 1 -- HA WebSocket client
master: 99b31fb docs: record Stage 0 end-to-end spike result

## Context reset prompt location
onboarding/staff/CLAUDE_CODE_WORKFLOW.md
