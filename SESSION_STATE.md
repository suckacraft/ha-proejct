# Session State

This file is updated automatically at every checkpoint and stage
completion. If starting a new session, read this file first.

## Current stage
Stage 0 (end-to-end spike) -- NOT yet started

## Last completed
Session tooling/config setup: fixed .claude/settings.json hooks (correct
matcher+hooks[] shape, stdin-based commands), added CLAUDE.md workflow
rules 16-20 (model selection, effort, context discipline, CLAUDE.md
discipline, context window management), created .claudeignore and
SESSION_STATE.md, added env.DISABLE_NON_ESSENTIAL_MODEL_CALLS, gitignored
ha-key.txt, installed ccusage globally.

## In progress
Nothing -- stopped at a clean checkpoint before starting the spike
(rule 20: do not start a new stage with context heavily loaded).

## Next action
Build the Stage 0 end-to-end spike: one real light controllable from a
browser through a throwaway HA WebSocket script. Build on a `spike`
branch, then delete from master. First step: verify the HA long-lived
token in packages/ha-core/config.json authenticates and pick one safe
light entity. HA is running locally (localhost:8123 returned HTTP 200).
See STAGE 0 in docs/HA_PROJECT_KICKOFF_PROMPT.md.

## Open decisions
ha-key.txt in repo root is a leaked Claude credential (starts "claude",
296 chars), now gitignored but NOT yet removed/rotated -- handle later.

## Last commit
chore: session config -- workflow rules 16-20, hooks fix, ignore files,
session state (config/tooling only; no application code yet)

## Context reset prompt location
onboarding/staff/CLAUDE_CODE_WORKFLOW.md
