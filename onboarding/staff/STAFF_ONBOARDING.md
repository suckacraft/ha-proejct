# Staff Onboarding -- Smart Home Platform

Welcome to the team. This document gets you from zero to fully operational
on the smarthome-platform project. Work through it in order.

---

## Who this is for

- New developers joining the build team
- Electrician co-founders needing a dev environment for provisioning tools
- Future franchisee technical leads setting up their own environment

---

## Step 1 -- Dev environment setup

Run the setup script on a fresh Windows machine:

    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
    .\setup\setup-dev-environment.ps1

If anything fails, check setup/SETUP.md Known Issues section before debugging.

After the script completes, do the manual steps listed in the script output:
1. Complete HA setup wizard at http://localhost:8123
2. Restart HA: docker restart homeassistant
3. Generate HA token and update HASS_TOKEN in .claude.json
4. Add GitHub MCP with your personal GitHub token
5. Add Context7 MCP with your free API key from context7.com

---

## Step 2 -- Project orientation

Read these files in order before writing a single line of code:

1. CLAUDE.md -- Standing rules Claude Code follows on this project
2. FUNCTIONALITY.md -- What has already been built
3. PROGRESS.md -- Current state and what comes next
4. onboarding/staff/CLAUDE_CODE_WORKFLOW.md -- How we use Claude Code here
5. onboarding/staff/MCP_SCHEDULE.md -- Which MCPs to activate per stage

This takes about 20 minutes and saves hours of confusion.

---

## Step 3 -- Understand the architecture

The platform has three layers:

    ha-core        Node.js adapter between HA and the frontend
    client-app     React PWA -- what clients see and interact with
    operator-app   React dashboard -- what we use to manage all client sites

Key decisions already made (do not revisit without a team discussion):
- ha-core talks to HA over localhost
- Browser gets real-time updates via SSE, not WebSocket
- All credentials stored via SOPS encrypted secrets
- Client remote access via Cloudflare Tunnel (not Tailscale)
- Operator/support access via Tailscale (not Cloudflare Tunnel)
- Auth is handled by ha-core, never HA's own auth system
- State management is Zustand, never React Context for entity state
- All npm dependencies pinned to exact versions

---

## Step 4 -- Your first task

Before touching application code, run Stage 0 (the throwaway spike):

Open Claude Code from the project folder:

    cd C:\Users\USERNAME\smarthome-platform
    claude

Paste the Stage 0 prompt from the kickoff document:
    docs/HA_PROJECT_KICKOFF_PROMPT.md

Stage 0 proves the full round trip works -- one light, controllable end to end.
It is deliberately ugly and throwaway. Do not build on it.

---

## Step 5 -- Ongoing workflow

See CLAUDE_CODE_WORKFLOW.md for the full session discipline.

Short version:
- Always run `claude mcp list` at the start of a session
- Always work from inside C:\Users\USERNAME\smarthome-platform
- Always end a session with "update PROGRESS.md before we stop"
- Always enter plan mode (Shift+Tab) before a new stage
- Never run more than 2 MCPs simultaneously (Stage 11 is the exception)

---

## Contacts

Technical lead: Josh
Electrician co-founder: [Name]
HA community: community.home-assistant.io
Project issues: [GitHub repo URL when created]
