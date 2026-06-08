# Smart Home Platform -- Dev Environment Setup Guide

This document is the living record of how to set up a fresh Windows development
environment for the smarthome-platform project. Update it whenever a new issue
is discovered or a fix is applied. The setup script (setup-dev-environment.ps1)
and this document should always be in sync.

---

## Quick Start

Run this in PowerShell as Administrator on a fresh Windows machine:

    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
    .\setup-dev-environment.ps1

If you hit any errors, check the Known Issues section below before debugging.

---

## Prerequisites

- Windows 10 Home or Windows 11 (any edition)
- Internet connection
- PowerShell run as Administrator
- 20GB free disk space minimum

---

## What Gets Installed

| Tool | Purpose | How |
|---|---|---|
| WSL | Required for Docker on Windows | winget |
| Docker Desktop | Runs HA and future containers | winget |
| Node.js LTS | Required for Claude Code and npm | winget |
| VS Code | Code editor, config file editing | winget |
| Git | Version control | winget |
| Tailscale | Remote access to client sites | winget |
| Cloudflared | Client-facing remote access tunnel | winget |
| Postman | Testing ha-core REST API | winget |
| Raspberry Pi Imager | Flashing Pi SD cards | winget |
| MQTT Explorer | Debugging Zigbee2MQTT | winget |
| Claude Code | AI coding agent | npm global |
| home-assistant-best-practices | HA domain knowledge skill | npx skills |
| find-skills | Skills discovery tool | npx skills |
| homeassistant-manager | HA automation workflow skill | git clone |
| filesystem MCP | Claude Code project file access | .claude.json |
| ha-mcp (hass-mcp) | Live HA connection for Claude Code | .claude.json |
| Home Assistant | Smart home hub (dev instance) | Docker |

---

## Manual Steps After Script

These cannot be automated because they require user interaction or personal tokens:

1. Complete the HA setup wizard at http://localhost:8123
2. Restart HA to load demo entities: `docker restart homeassistant`
3. Generate HA long-lived token: Profile > Security > Long-lived access tokens
4. Update HASS_TOKEN in .claude.json: `code $env:USERPROFILE\.claude.json`
5. Add GitHub MCP (requires GitHub personal access token)
6. Add Context7 MCP (requires free API key from context7.com)
7. Remove ha-mcp from active MCPs until Stage 1 of the build

---

## MCP Configuration Reference

All project MCPs live in .claude.json under:
projects > C:/Users/USERNAME/smarthome-platform > mcpServers

### filesystem (always active)

    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "C:\\Users\\USERNAME\\smarthome-platform"],
      "env": {}
    }

### ha-mcp (activate per stage schedule only)

    "ha-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "hass-mcp"],
      "env": {
        "HASS_URL": "http://localhost:8123",
        "HASS_TOKEN": "YOUR_TOKEN_HERE"
      }
    }

IMPORTANT: The npm package is hass-mcp, NOT @homeassistant-ai/ha-mcp.
IMPORTANT: Environment variable names are HASS_URL and HASS_TOKEN, NOT HA_URL and HA_TOKEN.

### github (activate at Stage 6.5 and 10 only)

    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "YOUR_TOKEN_HERE"
      }
    }

---

## Home Assistant Docker Reference

Config path: C:\Users\USERNAME\homeassistant\
HA data: C:\Users\USERNAME\homeassistant\config\
URL: http://localhost:8123

docker-compose.yml (correct Windows version):

    services:
      homeassistant:
        container_name: homeassistant
        image: ghcr.io/home-assistant/home-assistant:stable
        volumes:
          - C:/Users/USERNAME/homeassistant/config:/config
        restart: unless-stopped
        ports:
          - "8123:8123"
        environment:
          - TZ=Australia/Melbourne

Common commands:

    docker compose up -d          start HA
    docker compose down           stop HA
    docker restart homeassistant  restart HA (e.g. after config change)
    docker logs homeassistant     view HA logs
    docker ps                     check container status

---

## Known Issues and Fixes

### Issue: ha-mcp fails to connect with @homeassistant-ai/ha-mcp
Date discovered: June 2026
Symptom: npm error 404 Not Found for @homeassistant-ai/ha-mcp
Root cause: homeassistant-ai/ha-mcp is a Python/HA addon, not an npm package.
Fix: Use hass-mcp instead. Package name in npm registry is simply hass-mcp.

### Issue: hass-mcp fails with ZodError HASS_URL required
Date discovered: June 2026
Symptom: ZodError: HASS_URL Required, HASS_TOKEN Required
Root cause: Wrong environment variable names. hass-mcp uses HASS_URL and
HASS_TOKEN, not HA_URL and HA_TOKEN.
Fix: Update .claude.json env block to use HASS_URL and HASS_TOKEN.

### Issue: docker compose fails with network_mode:host
Date discovered: June 2026
Symptom: HA container starts but no port exposed, http://localhost:8123 unreachable
Root cause: network_mode:host is a Linux-only Docker feature. Docker Desktop
for Windows does not support it.
Fix: Remove network_mode:host from docker-compose.yml and use explicit port
mapping: ports: - "8123:8123"

### Issue: /etc/localtime volume mount fails on Windows
Date discovered: June 2026
Symptom: Docker container fails to start or throws volume error
Root cause: /etc/localtime does not exist on Windows.
Fix: Remove the /etc/localtime volume mount. Use the TZ environment variable
instead: environment: - TZ=Australia/Melbourne

### Issue: WSL not installed -- docker command not found
Date discovered: June 2026
Symptom: docker: The term 'docker' is not recognized after Docker Desktop install
Root cause: Docker Desktop requires WSL on Windows. WSL was not installed.
Fix: Run wsl --install --no-distribution then reboot. Re-run setup script after reboot.

### Issue: Claude Code MCP CLI env var syntax fails on Windows PowerShell
Date discovered: June 2026
Symptom: error: missing required argument 'commandOrUrl' when using -e flag
Root cause: The -e/--env flag syntax for claude mcp add does not parse correctly
in Windows PowerShell for all MCP types.
Fix: Write MCP config directly to .claude.json instead of using the CLI.
Use VS Code (code $env:USERPROFILE\.claude.json) to edit the file.

### Issue: Invalid JSON in .claude.json after manual editing
Date discovered: June 2026
Symptom: Configuration Error -- Unexpected non-whitespace character after JSON
Root cause: Two issues found together:
  1. Trailing comma after last item in mcpServers object
  2. Project-level fields (enabledMcpjsonServers etc) ended up outside
     the project object instead of inside it
Fix: Open .claude.json in VS Code, use Ctrl+Shift+P > Format Document to
highlight errors. Check that all project fields are inside the correct
project object. JSON does not allow trailing commas.

### Issue: Demo integration cannot be added from HA UI
Date discovered: June 2026
Symptom: "This integration cannot be added from the UI" dialog
Root cause: The Demo integration requires a configuration.yaml entry, not UI.
Fix: Add demo: on its own line to configuration.yaml, then restart HA.
The setup script now does this automatically.

### Issue: Skills installed to wrong agent directory
Date discovered: June 2026
Symptom: Skills install succeeds but do not appear in Claude Code (/skills list)
Root cause: npx skills add without -a flag installs to ~/.agents/skills/ but
Claude Code reads from ~/.claude/skills/ -- different directories.
Fix: Always use -a claude-code flag: npx skills add <repo> --skill <name> -a claude-code -g

### Issue: Context monitoring rule in CLAUDE.md is best-effort only
Date discovered: June 2026
Symptom: Claude misses the 70% compact threshold or hits the context limit before
acting on it, because the rule relies on Claude's self-reporting of context fill.
Root cause: CLAUDE.md rule 20 asks Claude to "monitor context usage continuously"
but Claude has no reliable way to know its own fill percentage mid-turn.
Fix: Enforce via Stop hook in .claude/settings.json. The hook reads the transcript
from each Stop event, estimates fill from JSON byte length (full context ≈ 800k
chars for Opus 4.8 with 200k tokens), and injects a compaction prompt back to
Claude if fill exceeds 70% (compact) or 85% (checkpoint). This fires automatically
on every response without Claude needing to self-report.

### Issue: stale ha-core after commits — SSE updates stop working
Date discovered: June 2026
Symptom: Tiles show correct state on page load but do not update in real time.
Toggling a device in HA or from the app requires a page refresh to see the change.
Root cause: ha-core was started with node (not nodemon), or was started before a
commit that changed src/index.js. The Stage 3.5 wireEvents broadcast the raw
ws-client event shape { entity_id, new_state, old_state } directly over SSE.
Stage 4 refactored wireEvents to normalise before broadcast. If the server is
running Stage 3.5 code, useHA receives data.id === undefined and all SSE updates
write to the wrong Zustand Map key — tiles never update live.
Fix: Always restart ha-core after pulling new commits that touch ha-core/src/.
Kill the running process (Ctrl+C) and re-run, on Windows PowerShell:
  cd C:\Users\Josh\smarthome-platform
  $env:HASS_URL="http://localhost:8123"
  $env:HASS_TOKEN="YOUR_TOKEN"
  npm run dev -w packages/ha-core
The normalised SSE envelope is: { id, domain, name, state, attributes, lastChanged }
NOT: { entity_id, new_state, old_state }
This contract is verified by the wireEvents tests in ha-core/test/events.test.js.

### Issue: right-click Open PowerShell missing in Windows 11
Date discovered: June 2026
Symptom: No PowerShell option in right-click context menu
Root cause: Windows 11 replaced "Open PowerShell here" with "Open in Terminal"
Fix option 1: Right-click folder > Open in Terminal > type powershell > Enter
Fix option 2: Click address bar in File Explorer > type powershell > Enter
Fix option 3 (permanent): Run this in Administrator PowerShell to restore it:
  $p = "Registry::HKEY_CLASSES_ROOT\Directory\shell\PowerShell"
  New-Item -Path $p -Force
  Set-ItemProperty -Path $p -Name "(Default)" -Value "Open PowerShell here"
  Set-ItemProperty -Path $p -Name "Icon" -Value "powershell.exe"
  New-Item -Path "$p\command" -Force
  Set-ItemProperty -Path "$p\command" -Name "(Default)" -Value 'powershell.exe -NoExit -Command "Set-Location -LiteralPath ''%V''"'

### Issue: Write-protect hook matches config.json by filename, not path
Date discovered: June 2026
Symptom: Edit/Write to any file named config.json is blocked by the pre-tool hook,
including template and provisioning files that should be freely editable.
Root cause: The PreToolUse hook in .claude/settings.json used a filename-only regex
(config\.json$) which matched all config.json files in the project regardless of path.
Fix: Updated hook to match specific protected paths only:
  packages/client-app/client.config.json
  packages/operator-app/client.config.json
  .env (exact match)
Note: If you add new config.json files that should be editable (fixtures, templates,
provisioning configs), no change is needed. If you add a new sensitive config file
that must be write-protected, add its path to the regex in the PreToolUse hook in
.claude/settings.json.

### Issue: PowerShell 5.1 script encoding -- avoid em dashes in strings
Date discovered: June 2026
Symptom: "The string is missing the terminator" parse error in PowerShell scripts.
Missing closing braces cascade from the unterminated string.
Root cause: PowerShell 5.1 on Windows parses .ps1 files as Windows-1252 by default.
The UTF-8 em dash (U+2014, bytes E2 80 94) has byte 0x94 which Windows-1252
interprets as a right curly double-quote, closing the string prematurely.
Fix: Never use em dashes (--) inside PowerShell string literals.
Use a plain hyphen (-) or double hyphen (--) instead.
Em dashes in comments are safe (parser ignores comment content).

### Issue: Tailwind 4 + Vite -- never create postcss.config.js
Date discovered: June 2026
Symptom: Browser shows PostCSS error: "trying to use tailwindcss directly as a
PostCSS plugin"
Root cause: postcss.config.js intercepts @import "tailwindcss" before
@tailwindcss/vite can process it, triggering Tailwind's guard error. Even an
autoprefixer-only postcss.config.js causes this.
Fix: Delete postcss.config.js entirely. @tailwindcss/vite handles everything.
No PostCSS configuration file should exist in the client-app package.

### Issue: iOS Web Push requires PWA installed to home screen
Date discovered: June 2026
Symptom: Push notifications not received on iOS devices even after Stage 7.5 is
complete and Web Push is working on Android.
Root cause: iOS only delivers Web Push to installed PWAs. A website open in Safari
does not receive push.
Fix: During client handover, install the PWA on every iOS device in the household
via Safari > Share > Add to Home Screen. Open the installed app and accept
notification permissions. This is mandatory for the security alert use case.
Document in CLIENT_HANDOVER.md.
Note: Stage 13 React Native solves this permanently via native APNs push
notifications.

---

## Update Log

| Date | Version | Change |
|---|---|---|
| June 2026 | v1.0 | Initial release |
| June 2026 | v1.1 | Added -y flag to npx skills commands |
| June 2026 | v1.2 | Fixed ha-mcp package name and env vars, fixed docker-compose for Windows, fixed skills agent targeting, added Demo integration auto-setup, direct .claude.json write for MCP config |
| June 2026 | v1.3 | Added context-monitoring Stop hook to .claude/settings.json; documented CLAUDE.md rule 20 enforcement limitation |
| June 2026 | v1.4 | Added stale ha-core gotcha: SSE stops working if server runs old code after a commit |
| June 2026 | v1.5 | Added Tailwind 4 postcss.config.js and iOS Web Push known issues; expanded the stale ha-core restart steps for PowerShell |
| June 2026 | v1.6 | Added PowerShell 5.1 encoding gotcha: em dashes in string literals cause unterminated string parse errors |
| June 2026 | v1.7 | Write-protect hook updated to path-specific matching; documented filename-pattern gotcha |

---

## When You Find a New Issue

1. Fix it in setup-dev-environment.ps1
2. Add it to the Known Issues section above with: date, symptom, root cause, fix
3. Update the version number and Update Log
4. Commit both files together with message: "fix: [issue description]"

This document is the source of truth for setup. If something broke once, it
will break again on the next fresh machine. Document it here.

---

## Pi and Client Device Setup

See dedicated guides:

    setup/pi/PI_SETUP.md                          Raspberry Pi 5 from unboxing to operational
    setup/client-device/CLIENT_DEVICE_SETUP.md    Production client device (Pi or mini PC)
    setup/client-device/DEV_VS_CLIENT.md          Key differences -- read before first client install

### Critical distinction: Docker networking on Windows vs Linux

Windows (dev laptop): network_mode:host does NOT work
  Use: ports: - "8123:8123"

Linux (Pi or mini PC): network_mode:host WORKS and is preferred
  Use: network_mode: host

Never copy a Windows docker-compose.yml to a Pi or mini PC.

### Known issue: Demo integration on client devices
The demo: line in configuration.yaml creates fake entities.
It is added automatically by the dev setup script for testing.
It must NOT be present on client devices.
The provisioning checklist (provisioning/PROVISIONING.md) includes
a check for this. Always verify configuration.yaml before client handover.
