# Pipeline Prompt -- Agentic Build Mode

This prompt loads the full build pipeline into Claude Code as an autonomous
queue. Claude works through stages in order with checkpoint gates between each.
You respond with proceed, stop, or retry to control progression.

Use this after Stage 0 is complete and the architecture is confirmed working.

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

Safe stages for agentic runs (low architectural risk, clear test gates):
- Stages 3 through 6 once ha-core is confirmed working
- Stage 8 (operator dashboard) once auth is complete
- Stage 9 (whitelabel validation) -- config only
- Stage 10 (Docker + docs) -- mechanical, low risk

Always manual (review every step yourself):
- Stage 0 (spike) -- throwaway, needs your eyes on the result
- Stage 6.5 (auth) -- highest security risk, never agentic
- Stage 11 (provisioning) -- real credentials involved

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
