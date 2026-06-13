# Raspberry Pi 5 Setup Guide

---

## Phase 0: Network + SSH

Complete this phase before running the ha-core deploy pipeline. The Pi must be
reachable by SSH from both the PC and the laptop before any automated deploy can work.

### Run order

| Step | Where | Command |
|---|---|---|
| 1 | - | Power on the Pi |
| 2 | PC | `.\setup\00-discover-pi.ps1` |
| 3 | PC | `.\setup\01-setup-ssh-keys.ps1` |
| 4 | Laptop | `.\setup\01-setup-ssh-keys.ps1` |
| 5 | Pi | `bash setup/02-harden-pi-ssh.sh` |
| 6 | Router | Set a static DHCP lease for the Pi's MAC address |
| 7 | - | Proceed to the ha-core deploy pipeline below |

### Notes

- **Step 2** (`00-discover-pi.ps1`) tries mDNS (`piserver.local`) first, then
  falls back to an ARP sweep scanning for Raspberry Pi MAC OUIs. It polls every
  10 seconds for up to 5 minutes. If it times out, follow the ethernet fallback
  in `setup/PI_NETWORK_RECOVERY.md`.
- **Steps 3 and 4** must be run on each machine independently. Each machine needs
  its own public key in the Pi's `authorized_keys`. Pass `-PiTarget <IP>` if
  `piserver.local` does not resolve yet.
- **Step 5** disables password auth. Keep one SSH session open and test a second
  before closing the first.
- **Step 6**: when step 2 finds the Pi, it prints the MAC address. Log into the
  router at `192.168.0.1` and bind that MAC to a fixed IP. Without this, the
  Pi's address can change after a reboot and break the deploy scripts.

### Network: subnet reference

| Host | IP |
|---|---|
| Router | 192.168.0.1 |
| PC (JOSH) | 192.168.0.21 |
| Laptop (hooby) | 192.168.0.23 |
| Pi (assign) | 192.168.0.x (set via static DHCP lease) |

---

This guide covers the Pi 5 in two contexts:

1. DEV/POC use -- your home lab Pi used for learning and building
2. CLIENT use -- a Pi deployed to a client site as the production hub

This is the living runbook for the Pi. Sections: Quick Start, What Gets
Installed, Manual Prerequisites, Manual Steps After Deploy, Future ops-agent
layer, Known Issues, Update Log.

There are two layers to a Pi build:

- **Manual prerequisites** (first boot): flash the SD, set a static IP, move
  boot to USB SSD, plug in the Zigbee dongle and Coral TPU. These are physical
  and one-time, so they stay manual. They are the numbered Steps below.
- **The deploy pipeline** (automated): once the Pi boots and SSH works, the
  whole runtime stack is installed from your laptop by the three setup scripts.
  The old manual Docker and Home Assistant steps (Steps 6 and 8) are now done
  for you by the pipeline and are kept below as reference only.

---

## Quick Start (the deploy pipeline)

Run from your LAPTOP once the Pi has booted and you can `ssh pi@<pi-ip>`:

    # 1. On the PC (JOSH), as Administrator, ONCE:
    setup\01-enable-ssh-on-pc.ps1

    # 2. On the laptop, ONCE (persists the Z: drive mapping):
    setup\02-persist-z-drive.ps1

    # 3. On the laptop: copy the secrets template and fill it in
    copy setup\pi\.env.example setup\pi\.env
    notepad setup\pi\.env        # set PC_IP, PI_IP, TS_AUTHKEY, HASS_*, etc.

    # 4. On the laptop: deploy (Home for the lab Pi, Client for a site)
    setup\03-deploy-pi.ps1 -Mode Home
    setup\03-deploy-pi.ps1 -Mode Client -PiIp 192.168.1.50

The deploy orchestrator waits for the Pi, zips the repo on the PC, copies it and
the populated `.env` to the Pi, then runs `pi-setup.sh` on the Pi and streams its
output back to your laptop in real time.

---

## What Gets Installed (by pi-setup.sh)

| Component | How | Mode |
|---|---|---|
| Docker Engine + Compose plugin | official apt repo, arm64 Bookworm | both |
| Home Assistant | Container, `network_mode: host`, stable image | both |
| Node 20 LTS | nvm | both |
| nginx | apt + `setup/pi/nginx/smarthome.conf` | both |
| Tailscale | install script + `TS_AUTHKEY`, Tailscale SSH on | both |
| cloudflared | arm64 `.deb` + token service stub | both |
| ha-core | systemd `ha-core.service` on :3001 | both |
| client-app + operator-app | `npm ci` + `npm run build`, served by nginx | both |
| ops-agent stub | disabled + masked systemd unit | **home only** |
| Claude Code | npm global, reachable via Tailscale SSH | **home only** |

nginx serves client-app on `:80` and operator-app on `:3002`, and proxies
`/api` to ha-core (`127.0.0.1:3001`) with SSE support. ha-core owns port 3001
directly; nginx does not add a second listener on it (see Known Issues).

---

## Hardware checklist before starting

- [ ] Raspberry Pi 5 8GB
- [ ] USB-C power supply (27W official Pi 5 PSU recommended)
- [ ] MicroSD card 32GB+ A2 rated (for initial boot only)
- [ ] USB SSD 256GB+ (production boot drive -- replaces SD after setup)
- [ ] Sonoff Zigbee 3.0 USB dongle
- [ ] Google Coral USB Accelerator (for Frigate -- buy from RS Components AU ~$99)
- [ ] MicroHDMI cable (optional -- only needed if SSH fails on first boot)
- [ ] Ethernet cable (strongly recommended over WiFi for first setup)

---

## Step 1 -- Flash the SD card (from your Windows laptop)

Download and install Raspberry Pi Imager:
winget install RaspberryPiFoundation.RaspberryPiImager

Open Raspberry Pi Imager:
- Device: Raspberry Pi 5
- OS: Raspberry Pi OS Lite (64-bit) -- no desktop, server only
- Storage: your SD card

Before writing, click the settings gear (or Ctrl+Shift+X) and configure:
- Hostname: piserver (or client site name for client devices e.g. thornbury)
- Username: pi
- Password: [strong password -- save it in your password manager]
- WiFi: your home network SSID and password (skip for client devices -- use ethernet)
- Enable SSH: yes, use password authentication
- Locale: Australia/Melbourne, keyboard layout: gb

Write the image. This takes 3-5 minutes.

---

## Step 2 -- First boot

Insert SD card into Pi. Connect ethernet cable to your router. Power on.
Wait 90 seconds for first boot to complete.

Find the Pi's IP address from your router's DHCP table, or try:

    ping piserver.local

SSH from your laptop:

    ssh pi@piserver.local

If that fails, try the IP address directly:

    ssh pi@192.168.1.X

Accept the SSH host key fingerprint when prompted.

---

## Step 3 -- Initial system update

    sudo apt update && sudo apt full-upgrade -y
    sudo reboot

Wait 60 seconds for reboot, then SSH back in.

---

## Step 4 -- Set a static IP (do this before anything else)

Either set a DHCP reservation in your router (recommended) or set a
static IP on the Pi itself. For router DHCP reservation, note the Pi's
MAC address:

    ip link show eth0

In your router admin, create a reservation: MAC -> fixed IP (e.g. 192.168.1.50)

From this point on, SSH to the fixed IP, not the hostname.

---

## Step 5 -- Install Tailscale

    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up

Follow the auth link printed in the terminal -- approve the device in
your Tailscale admin dashboard.

Test remote access by SSHing via the Tailscale IP:

    ssh pi@100.X.X.X

This is how you will manage this device forever -- local or remote.

---

## Step 6 -- Install Docker

NOTE: The deploy pipeline (pi-setup.sh) now installs Docker from the official
apt repo automatically. This manual step is kept for reference and for setting
up a Pi by hand without the pipeline.

    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker pi
    newgrp docker
    docker --version

Verify Docker works without sudo:

    docker ps

---

## Step 7 -- Move boot to USB SSD (production reliability)

SD cards fail. USB SSD is dramatically more reliable for production.

Connect the USB SSD. Find its device path:

    lsblk

It will appear as /dev/sda or similar.

Use Raspberry Pi Imager on your laptop to write the same OS image to the
USB SSD (same settings as Step 1). Then on the Pi:

Enable USB boot:

    sudo raspi-config
    Advanced Options > Boot Order > USB Boot

Reboot with the USB SSD connected. Verify it booted from USB:

    lsblk
    findmnt /

The root filesystem should be on /dev/sda not /dev/mmcblk0.

You can remove the SD card now. The Pi boots from USB SSD permanently.

---

## Step 8 -- Install Home Assistant (same for dev and client)

NOTE: The deploy pipeline (pi-setup.sh) now writes this exact docker-compose.yml
and starts Home Assistant automatically. This manual step is kept for reference.
We use Home Assistant CONTAINER (not Supervised) deliberately -- see Known Issues.

Create the HA directory structure:

    mkdir -p ~/homeassistant/config

Create docker-compose.yml:

    cat > ~/homeassistant/docker-compose.yml << 'EOF'
    services:
      homeassistant:
        container_name: homeassistant
        image: ghcr.io/home-assistant/home-assistant:stable
        volumes:
          - /home/pi/homeassistant/config:/config
          - /etc/localtime:/etc/localtime:ro
        restart: unless-stopped
        network_mode: host
        environment:
          - TZ=Australia/Melbourne
    EOF

NOTE: network_mode: host works correctly on Linux (Pi/mini PC). It does NOT
work on Docker Desktop for Windows. The Pi uses the Linux Docker engine
so host networking is correct and preferred here.

Start HA:

    cd ~/homeassistant
    docker compose up -d

Wait 90 seconds, then open HA from your laptop browser:

    http://192.168.1.50:8123

(Use the Pi's fixed IP from Step 4)

Complete the HA setup wizard. Create your admin account.

---

## Step 9 -- Add Demo integration (dev Pi only)

For your dev/POC Pi, add demo entities for testing:

    nano ~/homeassistant/config/configuration.yaml

Add at the bottom:

    demo:

Save (Ctrl+X, Y, Enter), then restart HA:

    docker restart homeassistant

Skip this step for client Pi devices.

---

## Step 10 -- Generate HA token

In HA web UI:
- Click your profile (bottom left)
- Scroll to Security > Long-lived access tokens
- Create token named "ha-core-dev" (dev) or "ha-core" (client)
- Copy immediately -- shown only once
- Save in your password manager

---

## Step 11 -- Configure Zigbee dongle

Insert the Sonoff Zigbee USB dongle. Find its device path:

    ls /dev/serial/by-id/

It will show something like:
usb-ITead_Sonoff_Zigbee_3.0_USB_Dongle_Plus_..._if00

Note the full path. You will need this for Zigbee2MQTT config.

---

## Step 12 -- Configure Coral TPU

Insert the Google Coral USB Accelerator. Verify it is detected:

    lsusb | grep Google

Install the Coral runtime:

    echo "deb https://packages.cloud.google.com/apt coral-edgetpu-stable main" | sudo tee /etc/apt/sources.list.d/coral-edgetpu.list
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
    sudo apt update
    sudo apt install libedgetpu1-std

Verify:

    lsusb | grep Global Unichip

---

## FROM HERE -- PATHS DIVERGE

### Dev/POC Pi (continue to DEV ONLY section below)
### Client Pi (see setup/client-device/CLIENT_DEVICE_SETUP.md)

---

## DEV ONLY -- Steps 13+ (home lab Pi)

### Step 13 -- Register ha-mcp for Claude Code

On your Windows laptop, update .claude.json with the Pi's fixed IP:

    "ha-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "hass-mcp"],
      "env": {
        "HASS_URL": "http://192.168.1.50:8123",
        "HASS_TOKEN": "YOUR_TOKEN_FROM_STEP_10"
      }
    }

Or via Tailscale IP for remote access:

    "HASS_URL": "http://100.X.X.X:8123"

### Step 14 -- Run Stage 0 from your laptop

With the Pi running HA and ha-mcp registered, you are ready to run
the Claude Code spike from your Windows laptop against a real Pi device.

Open Claude Code on your laptop:

    cd C:\Users\Josh\smarthome-platform
    claude

Paste the Stage 0 prompt from docs/HA_PROJECT_KICKOFF_PROMPT.md

---

## Useful Pi management commands

    # Check HA is running
    docker ps

    # View HA logs
    docker logs homeassistant -f

    # Restart HA
    docker restart homeassistant

    # Update HA to latest
    cd ~/homeassistant && docker compose pull && docker compose up -d

    # Check disk usage
    df -h

    # Check temperature (Pi 5 throttles at 85C)
    vcgencmd measure_temp

    # Check USB devices
    lsusb

    # Check Zigbee dongle
    ls /dev/serial/by-id/

    # Reboot Pi
    sudo reboot

    # Shutdown Pi safely (before power off)
    sudo shutdown -h now

---

## Manual Steps After Deploy

The pipeline cannot do these because they need a person or a personal token:

1. Complete the Home Assistant onboarding wizard at `http://<pi-ip>:8123` and
   create the admin account.
2. Generate a Long-Lived Access Token (HA profile > Security) and put it in
   `setup/pi/.env` as `HASS_TOKEN`, then re-deploy (or restart `ha-core`).
3. Create the Cloudflare Tunnel in the Cloudflare dashboard, copy its token into
   `CF_TUNNEL_TOKEN`, and re-deploy. Tunnel creation is intentionally manual.
4. Approve the device in the Tailscale admin console if your tailnet requires it.

---

## Future: ops-agent layer (HOME PI ONLY)

The home lab Pi is also the business demo device. It ships a DISABLED scaffold
for a future operations agent (`setup/pi/ops-agent.service.example`). Its
intended future job is log summaries, a client-hub heartbeat, and Frigate event
triage via a thin Claude API layer (`CLAUDE_OPS_API_KEY`).

Isolation rules (do not break these):

- The ops-agent is installed ONLY in `--mode home`, and even then it is copied
  in disabled and `systemctl mask`ed. It has no agent logic in this build.
- A CLIENT device must NEVER have the ops-agent, Claude Code, a Claude API key,
  or any dev tooling. `pi-setup.sh --mode client` actively removes an ops-agent
  unit if it finds one and installs none of the home-only tooling.
- The core stack (HA, ha-core, apps, nginx) is identical on both device classes.
  The ops-agent is an additive home-only layer, never a dependency of the core.

To work on it in the future: write the `ExecStart` script first, then
`sudo systemctl unmask ops-agent` and enable it -- on a HOME Pi only.

---

## Reference note: os-agent and why we use HA Container

If you ever evaluate Home Assistant SUPERVISED (the add-on-store flavour), its
companion package is **os-agent**, latest stable **1.9.0** (2026-05-22, asset
`os-agent_1.9.0_linux_aarch64.deb`). We do NOT use Supervised on this platform:

- Supervised is officially deprecated ("unsupported with the Home Assistant OS
  2025.12.0 release") and reports an unhealthy/unsupported state on Pi OS Lite.
- It would conflict with the Container-based stack this runbook standardises on.
- ha-core talks to Home Assistant over WebSocket + a long-lived token, so the HA
  flavour does not matter to the platform.

os-agent 1.9.0 is recorded here only as a reference point, not a dependency.

---

## Known Issues

### Port 3001: ha-core and nginx cannot both bind it
ha-core listens on `:3001` as its own systemd service. nginx therefore does NOT
add a second listener on 3001 (two processes cannot bind the same port).
Instead nginx serves the apps on `:80` and `:3002` and reaches ha-core as an
upstream at `127.0.0.1:3001` via the `/api/` locations. This is by design.

### SSE live updates break without the right nginx proxy headers
The `/api/events` proxy MUST set `proxy_buffering off`, `proxy_read_timeout
3600`, and clear the `Connection` header, or live tile updates stop arriving.
This is configured in `setup/pi/nginx/smarthome.conf`. Cross-referenced in
SETUP.md known issues.

### network_mode: host is Linux-only
The Pi uses `network_mode: host` in its docker-compose.yml. This is correct on
Linux and wrong on Docker Desktop for Windows (which needs port mapping). Never
copy a Windows compose file to the Pi. Cross-referenced in SETUP.md.

### demo: must never reach a client device
`demo:` in `configuration.yaml` creates fake entities. `pi-setup.sh --mode
client` asserts its absence and strips it if found, failing hard if it cannot.

---

## Update Log

| Date | Version | Change |
|---|---|---|
| June 2026 | v1.0 | Initial manual Pi setup guide (flash to operational) |
| June 2026 | v2.0 | Added the deploy pipeline (01/02/03 + pi-setup.sh): Quick Start, What Gets Installed, Manual Steps After Deploy, Future ops-agent layer, os-agent reference note, Known Issues, Update Log. Docker and HA steps marked automated. |
