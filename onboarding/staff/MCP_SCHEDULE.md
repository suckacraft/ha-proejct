# MCP Schedule -- Per Stage Reference

MCP tool descriptions sit in the context window every turn. Running all MCPs
simultaneously adds 4-6k tokens per request before you have asked anything.
Activate only the MCP needed for the current stage. Deactivate after.

## Playwright MCP (browser verification, any frontend stage)

Playwright MCP can be added for any stage that needs browser verification:

    claude mcp add playwright npx -- @playwright/mcp

Remove it once verification is complete. It counts as one of the two active MCP
slots, so deactivate another MCP if needed to stay within the limit. Install the
browser first:

    npx playwright install chromium

---

## Commands

    claude mcp add ha-mcp        activate HA connection
    claude mcp remove ha-mcp     deactivate HA connection
    claude mcp add github        activate GitHub
    claude mcp remove github     deactivate GitHub
    claude mcp list              confirm what is currently active

Rule: never run more than 2 MCPs simultaneously.
Exception: Stage 11 needs all three simultaneously (short stage, justified).
filesystem and Context7 stay active throughout -- they are low token overhead.

---

## Schedule

| Stage | filesystem | ha-mcp | github | Reason |
|---|---|---|---|---|
| 0 -- Spike | ON | OFF | OFF | Throwaway code, no HA validation needed |
| 1 -- WebSocket | ON | ON | OFF | Validate connection against real HA |
| 2 -- Entities | ON | ON | OFF | Test normalisation against real entity shapes |
| 3 -- REST API | ON | OFF | OFF | Test with curl/Postman, not MCP |
| 3.5 -- Persistence | ON | ON | OFF | Validate backup trigger hits HA snapshot API |
| 4 -- App foundation | ON | OFF | OFF | No live HA needed, keep context lean |
| 5 -- Components | ON | OFF | OFF | Most token-heavy stage, no MCPs beyond filesystem |
| 5.5 -- Home screen | ON | OFF | OFF | Weather and device counts come from the Zustand store, already seeded from ha-core |
| 6 -- Scenes | ON | OFF | OFF | Config-driven, test manually via running app |
| 6.5 -- Auth | ON | OFF | ON | Commit auth as tagged release before cameras |
| 7 -- Cameras | ON | ON | OFF | Validate Frigate entity structure via hass-mcp |
| 7.5 -- Push | ON | OFF | OFF | Test end to end via running app |
| 8 -- Operator | ON | ON | OFF | Validate health/history endpoints against real site |
| 9 -- Whitelabel | ON | OFF | OFF | Config file swapping only |
| 10 -- Docker | ON | OFF | ON | Tag production release and push final config |
| 11 -- Provisioning | ON | ON | ON | All three needed: validate, commit, provision |

---

## ha-mcp config reference

Package: hass-mcp (npm)
NOT @homeassistant-ai/ha-mcp (that is a Python addon, not npm)

Environment variables:
- HASS_URL (not HA_URL)
- HASS_TOKEN (not HA_TOKEN)

JSON config in .claude.json:

    "ha-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "hass-mcp"],
      "env": {
        "HASS_URL": "http://localhost:8123",
        "HASS_TOKEN": "YOUR_TOKEN_HERE"
      }
    }

---

## Session start checklist

Run this at the start of every Claude Code session:

    claude mcp list

Confirm only filesystem and Context7 are active before starting.
Activate the stage-specific MCP only when you reach that stage.
