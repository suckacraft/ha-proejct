# Session State

This file is updated automatically at every checkpoint and stage
completion. If starting a new session, read this file first.

## Current stage
Stage 0 (end-to-end spike) -- COMPLETE

## Last completed
Stage 0 spike validated the full path end to end: browser button -> Node
WebSocket script -> HA call_service -> real light (light.bed_light) toggled
off->on->off, cross-checked against HA /api/states. Committed on the `spike`
branch (6b0cc39); throwaway, not built upon.

## In progress
Nothing.

## Next action
Stage 1: build packages/ha-core/src/ws-client.js -- HA WebSocket client with
auth, reconnection (exponential backoff, 30s cap), events
(connected/disconnected/state_changed/error), state_changed subscription,
local entity cache (Map), and getState/getAllStates/subscribe. Test: log 5
state_changed events from live HA. MCP schedule for Stage 1: Filesystem +
hass-mcp. See STAGE 1 in docs/HA_PROJECT_KICKOFF_PROMPT.md.

## Open decisions
- ha-key.txt in repo root is a leaked Claude credential (gitignored, not yet
  removed/rotated) -- handle later.
- spike/.ha-token holds the live HA long-lived token (gitignored on both
  master and spike). Revoke it in HA after the spike if desired.

## Last commit
master: docs -- record Stage 0 spike result (this commit)
spike branch: 6b0cc39 chore(spike): Stage 0 end-to-end spike

## Context reset prompt location
onboarding/staff/CLAUDE_CODE_WORKFLOW.md
