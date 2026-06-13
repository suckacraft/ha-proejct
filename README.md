# Smart Home Platform

A professional smart home integration platform for mid-market Victorian
residential clients. Built on Home Assistant with a custom white-label
PWA frontend, local AI cameras, and a managed service model.

---

## Quick links

### Development setup
| What | Where |
|---|---|
| Set up a Windows dev machine | setup/setup-dev-environment.ps1 |
| Set up Home Assistant only | setup/setup-homeassistant.ps1 |
| Setup troubleshooting and known issues | setup/SETUP.md |
| Set up Raspberry Pi 5 (dev or client) | setup/pi/PI_SETUP.md |
| Set up a client device (Pi or mini PC) | setup/client-device/CLIENT_DEVICE_SETUP.md |
| Dev vs client device differences | setup/client-device/DEV_VS_CLIENT.md |

### Staff onboarding
| What | Where |
|---|---|
| New staff onboarding | onboarding/staff/STAFF_ONBOARDING.md |
| MCP activation schedule | onboarding/staff/MCP_SCHEDULE.md |
| Claude Code session workflow | onboarding/staff/CLAUDE_CODE_WORKFLOW.md |

### Client onboarding
| What | Where |
|---|---|
| Post-install client walkthrough | onboarding/client/CLIENT_HANDOVER.md |
| Privacy policy (what we access) | onboarding/client/CLIENT_PRIVACY.md |
| Managed service tier descriptions | onboarding/client/MANAGED_SERVICE.md |

### Provisioning
| What | Where |
|---|---|
| New site commissioning checklist | provisioning/PROVISIONING.md |
| Site config template | provisioning/site-template/site.config.json |

### Build
| What | Where |
|---|---|
| Full build kickoff prompt | docs/HA_PROJECT_KICKOFF_PROMPT.md |
| Agentic pipeline prompt | docs/PIPELINE_PROMPT.md |
| What has been built | FUNCTIONALITY.md |
| Current build progress | PROGRESS.md |
| Standing Claude Code rules | CLAUDE.md |

---

## Architecture summary

Three-layer monorepo:

- **ha-core** — Home Assistant WebSocket adapter and REST API (Express, port 3001)
- **client-app** — Homeowner-facing PWA (React + Vite + Tailwind, port 5173)
- **operator-app** — Installer/operator dashboard (React + Vite + Tailwind, port 5174)

Home Assistant runs on a mini PC (or Pi 5 for lighter installs) at each
client site, alongside ha-core (a Node.js adapter). They communicate over
localhost using host networking (Linux Docker -- not Windows Docker).

The client-facing React PWA connects via SSE for real-time state and
REST for commands. When clients are away, they connect via a per-site
Cloudflare Tunnel. We (the operator) connect via Tailscale for support.

Credentials are SOPS-encrypted on every client device. Config and camera
event clips back up nightly to Backblaze B2. HA updates roll out staged --
our home first, then pilot clients, then all sites.

---

## Stack

    ha-core:      Node.js, Express, SQLite
    client-app:   React, Vite, Tailwind, Zustand
    operator-app: React, Vite, Tailwind
    Transport:    SSE browser-to-ha-core, WebSocket ha-core-to-HA only
    Infra:        Docker, Tailscale, Cloudflare Tunnel, Backblaze B2, SOPS

---

## Monorepo Structure

```
smarthome-platform/
├── packages/
│   ├── ha-core/        # HA adapter service
│   ├── client-app/     # Homeowner PWA
│   └── operator-app/   # Operator dashboard
├── docker-compose.yml
├── package.json        # Root workspace config
└── CLAUDE.md           # AI assistant rules
```

## Quick Start

Double-click `start.bat` to start everything.

| | |
|---|---|
| Management dashboard | http://localhost:3001/manage |
| Client app | http://localhost:5173 |
| Home Assistant | http://localhost:8123 |
| ha-core API | http://localhost:3001 |

To stop all services: double-click `stop.bat`  
To check status: double-click `status.bat`

**First time setup:**
1. Copy `.env.local.example` to `.env.local`
2. Add your HA token to `.env.local`
3. Double-click `start.bat`

---

## Dev Commands

```bash
npm install          # Install all workspace deps
npm run dev          # Start all packages in dev mode
npm run build        # Build all packages
```

---

## Critical: Docker networking differences

Windows (dev laptop): network_mode:host does NOT work
  docker-compose uses:  ports: - "8123:8123"

Linux (Pi or mini PC): network_mode:host WORKS and is preferred
  docker-compose uses:  network_mode: host

Never copy a Windows docker-compose.yml to a Pi or mini PC.
See setup/client-device/DEV_VS_CLIENT.md for full comparison.

---

## Deployment

ha-core runs persistently on the Pi (192.168.0.26) under PM2 with systemd
auto-restart on boot. No Docker.

### One-time Pi setup

```bash
ssh joshsaka@192.168.0.26 'bash -s' < scripts/pi-setup.sh
```

Then copy the env template to the Pi and fill in your HA token and any
site-specific overrides:

```bash
scp packages/ha-core/.env.example joshsaka@192.168.0.26:~/ha-core/.env
ssh joshsaka@192.168.0.26 "nano ~/ha-core/.env"
```

### Ongoing deploys

```bash
npm run deploy:pi
```

Rsyncs `packages/ha-core/` to the Pi, runs `npm install --production`, and
restarts the PM2 process. The Pi's `.env` is never overwritten.

### Operations

```bash
# Process status
ssh joshsaka@192.168.0.26 "pm2 status"

# Tail logs
ssh joshsaka@192.168.0.26 "pm2 logs ha-core"

# Restart manually
ssh joshsaka@192.168.0.26 "pm2 restart ha-core"
```
