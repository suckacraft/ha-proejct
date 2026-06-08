# Pipeline Prompt -- Agentic Build Mode

This prompt loads the full build pipeline into Claude Code as an autonomous
queue. Claude works through stages in order with checkpoint gates between each.
You respond with proceed, stop, or retry to control progression.

Use this after Stage 0 is complete and the architecture is confirmed working.

---

## Stage queue and status

Completion status as of this refresh (FUNCTIONALITY.md and SESSION_STATE.md are
the source of truth):

Complete:
- Stage 0   -- end-to-end spike (throwaway)
- Stage 1   -- ha-core WebSocket client
- Stage 2   -- ha-core entity normalisation
- Stage 3   -- ha-core REST API + Express server
- Stage 3.5 -- ha-core persistence + Backblaze B2 backup + preferences API
- Stage 4   -- client-app foundation (config, shell, useHA, PWA)
- Stage 5   -- room detail + entity tiles (TILE_MAP)
- Stage 5.5 -- home screen dashboard (/home default route)

In progress:
- LightTile UI mobile polish (refinement, not a blocking stage)

Queued (dependency order):
- Stage 6    -- scenes tab                    [agentic-safe]
- Stage 6.5  -- authentication                [ALWAYS MANUAL]
- Stage 7    -- camera view                   [ALWAYS MANUAL]
- Stage 7.5  -- push notifications            [agentic-safe]
- Stage 8    -- operator dashboard            [ALWAYS MANUAL]
- Stage 9    -- whitelabel validation         [agentic-safe]
- Stage 10   -- production Docker Compose      [agentic-safe]
- Stage 11   -- site provisioning             [ALWAYS MANUAL]

Post-Stage-11 queue:
- Stage 12   -- remaining core tiles          [agentic-safe]
- Stage 13   -- React Native iOS and Android  [classify when scoped]
- Stage 14   -- energy dashboard              [agentic-safe]
- Stage 15   -- MediaTile + audio integration [classify when scoped]
- Stage 16   -- kiosk tablet app              [agentic-safe]
- Stage 17   -- franchisee management         [classify when scoped]
- Stage 18   -- AI vision layer               [classify when scoped]
- Stage 19   -- advanced automation builder   [classify when scoped]

Stage 5.5 is safe for agentic pipeline mode. Stages 1-5.5 are already complete;
the live queue starts at Stage 6.

---

## How to use this

1. Confirm HA is running and MCPs are set correctly for your starting stage
2. Open Claude Code: cd C:\Users\USERNAME\smarthome-platform && claude
3. Copy the PIPELINE PROMPT section below and paste it in
4. Claude will confirm the current state, propose Stage N, and wait
5. Review the plan and respond: proceed / stop / retry [issue]
6. Claude executes the stage, runs the test, commits on pass, reports back
7. Repeat from step 4 for each stage

Your responses:
    proceed             approve and move to next stage
    stop                halt -- you want to review manually
    retry [issue]       re-run current stage with a specific correction
    skip [reason]       skip this stage (use sparingly, document why)

---

## When to use agentic mode

Agentic-safe stages (low architectural risk, clear test gates):
- Stage 5.5 (home screen dashboard) -- config-driven, delivered, safe pattern
- Stage 6 (scenes) -- config-driven, test manually via the running app
- Stage 7.5 (push notifications) -- tested end to end via the running app
- Stage 9 (whitelabel validation) -- config only
- Stage 10 (Docker + docs) -- mechanical, low risk
- Stage 12 (remaining core tiles) -- follows the existing TILE_MAP pattern
- Stage 14 (energy dashboard) -- new domain, additive
- Stage 16 (kiosk tablet app) -- new package, additive

Always manual (review every step yourself):
- Stage 0 (spike) -- throwaway, needs your eyes on the result
- Stage 6.5 (auth) -- highest security risk, never agentic
- Stage 7 (cameras) -- security-sensitive feeds and lock context
- Stage 8 (operator dashboard) -- cross-site control plane, staged rollout controls
- Stage 11 (provisioning) -- real credentials involved

Stages 13, 15, 17, 18, and 19 are not yet classified -- decide per stage when scoped.

---

## PIPELINE PROMPT

Paste everything below this line into Claude Code:

---

You are working on the smarthome-platform project in agentic pipeline mode.

Before anything else:
1. Run claude mcp list and confirm active MCPs
2. Read CLAUDE.md, FUNCTIONALITY.md, and PROGRESS.md
3. Read onboarding/staff/MCP_SCHEDULE.md for MCP activation rules
4. Identify the current stage from PROGRESS.md
5. Confirm the stage and wait for my approval before proceeding

Pipeline rules for this session:
- Work through one stage at a time in dependency order
- At the end of each stage, run the stage test and show the evidence
- If the test passes: commit with message "Stage N complete: [name]",
  update FUNCTIONALITY.md and PROGRESS.md, then report back with a
  summary of what was built and what comes next. Wait for my response.
- If the test fails: stop immediately, report the failure with the
  exact error, and wait for my instruction before attempting a fix
- Never proceed to the next stage without my explicit "proceed" response
- Never run more than 2 MCPs simultaneously (Stage 11 exception applies)
- Activate and deactivate MCPs per the schedule in MCP_SCHEDULE.md
- Apply all CLAUDE.md rules throughout -- they do not relax in pipeline mode

After each stage completes and before reporting back, your summary must include:

STAGE COMPLETE: [stage name]
Test evidence: [actual output or log line proving the test passed]
Git commit: [commit hash]
What was built: [2-3 sentence summary]
Next stage: [name and brief description]
MCP change needed: [activate X / deactivate Y / no change]
Awaiting: proceed / stop / retry

Do not continue past a stage boundary until you receive my response.

Start now: read the project state files and tell me which stage we are on.

---

## Checkpoint response guide

After each stage summary, respond with one of:

    proceed

    stop
    [reason -- what you want to review or discuss]

    retry [specific issue]
    [e.g. "retry -- the light toggle is not reflecting in real time,
    check the SSE subscription in useHA"]

    skip [reason]
    [e.g. "skip -- we are using a different climate integration,
    Sensibo is not available yet"]

---

## Notes on token efficiency in pipeline mode

Pipeline mode is more token-efficient than manual session-by-session
work for three reasons:

1. Architecture context is loaded once and stays warm across stages
2. Claude makes better decisions within a stage when it knows what
   comes next -- fewer dead ends and rewrites
3. Fewer context resets means less re-reading of CLAUDE.md and PROGRESS.md

The checkpoint gates are the efficiency mechanism -- they let you stay
high-level while Claude handles execution detail. Your time is spent on
decisions, not on monitoring.

If the context window fills mid-pipeline, Claude will note it in its
summary. Start a new session with the context reset prompt from
onboarding/staff/CLAUDE_CODE_WORKFLOW.md and continue from the
last completed stage.
