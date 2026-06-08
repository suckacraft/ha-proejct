# Claude Code Workflow -- How We Build This Project

This document covers the session discipline, token efficiency practices,
and agentic pipeline approach we use on the smarthome-platform project.

---

## Core principle

Claude Code is fast on well-specified work. Our job is to keep the spec tight,
the context lean, and the stage gates honest. A well-structured session on a
well-specified stage burns far fewer tokens than exploratory back-and-forth.

---

## Starting a session

Always from inside the project folder:

    cd C:\Users\USERNAME\smarthome-platform
    claude

At the start of every session, run the context reset prompt (see below) to
orient Claude before touching any code.

---

## Context reset prompt

Paste this at the start of every new Claude Code session:

    Continuing the smarthome-platform project. Before doing anything else:
    1. Run claude mcp list and tell me what MCPs are currently active
    2. Read CLAUDE.md, FUNCTIONALITY.md, and PROGRESS.md
    3. Confirm what has been built, what is in progress, and what comes next
    4. Check the MCP schedule in onboarding/staff/MCP_SCHEDULE.md for the
       current stage and deactivate any MCPs not on the schedule
    5. Set session default: claude config set model claude-sonnet-4-6
    Enter plan mode (Shift+Tab) and propose the next step before writing
    any code. Wait for my confirmation before proceeding.

---

## Plan mode (mandatory before every stage)

Press Shift+Tab before pasting any stage prompt.
Claude proposes its implementation approach and waits for your approval.
Only approve and proceed once the plan looks right.
This is the single biggest token-saver -- catching a wrong approach before
Claude writes 300 lines of code.

---

## Agentic pipeline mode (for uninterrupted multi-stage runs)

For running multiple stages with minimal intervention, use this wrapper
around the stage prompts. Claude works through each stage, runs the test,
commits on pass, then waits for your checkpoint approval before proceeding.

Load the full pipeline by pasting the pipeline prompt from:
    docs/PIPELINE_PROMPT.md

The pipeline prompt loads all remaining stages as a queue. Claude works
through them in order with a checkpoint gate between each. You respond
with one of:

    proceed         move to next stage
    stop            halt and review
    retry [issue]   re-run current stage with a specific fix

When to use agentic pipeline mode:
- You have 2+ hours of uninterrupted time
- The stages ahead are well-understood (Stages 3-6 are safe candidates)
- HA is running and the ha-mcp schedule is correct for those stages

When NOT to use it:
- Stage 0 (spike) -- too throwaway, needs your eyes
- Stage 6.5 (auth) -- too high-risk, always review manually
- Any stage where you are not sure what success looks like

---

## Token efficiency practices

1. Only run MCPs relevant to the current stage (see MCP_SCHEDULE.md)
2. Use subagents for file exploration in Stage 5+:
   "Use a subagent to read the ha-core entity structure and report back"
3. Install Graphify when file count exceeds 100 (roughly Stage 5-6):
   github.com/safishamsi/graphify
4. End every session with "update PROGRESS.md before we stop"
5. Pin exact npm versions -- never let npm surprise you mid-build

---

## Recovery prompt

If something breaks mid-build:

    Something went wrong. Before fixing anything, tell me:
    1. Which file was last successfully written
    2. What the exact error is
    3. Which rule in CLAUDE.md is relevant to this error
    Propose a fix and wait for my approval before changing any code.
    Do not refactor anything outside the scope of the fix.

---

## Ending a session

Before closing Claude Code:

    Update PROGRESS.md with:
    - What was completed this session
    - What is currently in progress
    - Any blockers or open decisions
    - Which stage we are on
    Then commit everything with: git commit -am "Session complete: [stage name]"

---

## Skills reference

Skills load automatically when Claude detects a relevant task.
No manual activation needed.

    home-assistant-best-practices   HA YAML patterns, Zigbee, automation modes
    find-skills                     Search skills.sh registry for new capabilities
    homeassistant-manager           Automation deployment and validation workflow

Build custom skills after each major stage completes. See:
docs/HA_PROJECT_KICKOFF_PROMPT.md -- SKILLS TO BUILD section
