#!/usr/bin/env bash
# ============================================================
# Smart Home Platform -- Pi runtime setup v1.0
# Runs ON the Pi (Raspberry Pi 5, Pi OS Lite Bookworm, arm64).
# Linux-native equivalent of setup-dev-environment.ps1, runtime
# stack ONLY (no VS Code, Postman, MQTT Explorer).
#
# Usage:   ./pi-setup.sh --mode home
#          ./pi-setup.sh --mode client
#
# Modes:
#   home    full stack + disabled ops-agent stub + Claude Code
#   client  full stack ONLY, hardened, asserts no demo: entity
# When the mode is omitted it defaults to the more restrictive
# CLIENT behaviour (per the "when uncertain, err toward client"
# rule) and prints a warning.
#
# All secrets come from /opt/smarthome-platform/.env (deployed by
# 03-deploy-pi.ps1). The script fails by name if a required
# variable is missing. Every step is idempotent: safe to re-run.
#
# Changelog:
#   v1.0 - Initial release
# ============================================================

set -euo pipefail

SCRIPT_VERSION="1.0"

# ------------------------------------------------------------
# Constants
# ------------------------------------------------------------
REPO_DIR="/opt/smarthome-platform"
ENV_FILE="${REPO_DIR}/.env"
HA_DIR="${HOME}/homeassistant"
TZ_VALUE="Australia/Melbourne"
NVM_VERSION="v0.40.1"
NODE_MAJOR="20"
TOTAL_STEPS=10

# ------------------------------------------------------------
# Helpers (mirror setup-dev-environment.ps1: section + OK/WARN/FAIL)
# ------------------------------------------------------------
if [ -t 1 ]; then
    C_CYAN=$'\033[36m'; C_YEL=$'\033[33m'; C_GRN=$'\033[32m'
    C_RED=$'\033[31m';  C_GRY=$'\033[90m'; C_RST=$'\033[0m'
else
    C_CYAN=''; C_YEL=''; C_GRN=''; C_RED=''; C_GRY=''; C_RST=''
fi

section() {
    printf '\n%s================================================%s\n' "$C_CYAN" "$C_RST"
    printf '%s  %s%s\n' "$C_CYAN" "$1" "$C_RST"
    printf '%s================================================%s\n' "$C_CYAN" "$C_RST"
}
step() { printf '\n%s[%s/%s] %s%s\n' "$C_YEL" "$1" "$2" "$3" "$C_RST"; }
ok()   { printf '      %sOK: %s%s\n'   "$C_GRN" "$1" "$C_RST"; }
info() { printf '      %s%s%s\n'        "$C_GRY" "$1" "$C_RST"; }
warn() { printf '      %sWARN: %s%s\n' "$C_YEL" "$1" "$C_RST"; }
fail() { printf '\n      %sERROR: %s%s\n\n' "$C_RED" "$1" "$C_RST" >&2; }

# Error trap: report the line number and the command that failed.
trap 'rc=$?; fail "line ${LINENO}: exited ${rc} running: ${BASH_COMMAND}"; exit ${rc}' ERR

# ------------------------------------------------------------
# Parse arguments
# ------------------------------------------------------------
MODE=""
while [ "$#" -gt 0 ]; do
    case "$1" in
        --mode|-m) MODE="${2:-}"; shift 2 ;;
        --mode=*)  MODE="${1#*=}"; shift ;;
        *) fail "Unknown argument: $1 (use --mode home|client)"; exit 2 ;;
    esac
done

MODE="$(printf '%s' "$MODE" | tr '[:upper:]' '[:lower:]')"
if [ -z "$MODE" ]; then
    MODE="client"
    MODE_DEFAULTED=1
else
    MODE_DEFAULTED=0
fi
if [ "$MODE" != "home" ] && [ "$MODE" != "client" ]; then
    fail "Invalid mode '${MODE}'. Use --mode home or --mode client."
    exit 2
fi

# ------------------------------------------------------------
# Banner
# ------------------------------------------------------------
section "Pi runtime setup v${SCRIPT_VERSION}"
info "Mode:        ${MODE}"
info "Repo:        ${REPO_DIR}"
info "HA config:   ${HA_DIR}/config"
info "Node:        ${NODE_MAJOR} LTS (nvm ${NVM_VERSION})"
if [ "$MODE_DEFAULTED" = "1" ]; then
    warn "No --mode given. Defaulting to the restrictive CLIENT mode."
fi

# ------------------------------------------------------------
# Load and validate .env
# ------------------------------------------------------------
if [ ! -f "$ENV_FILE" ]; then
    fail "Secrets file not found: ${ENV_FILE}. 03-deploy-pi.ps1 should have copied it."
    exit 1
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Hard requirements: ha-core cannot run without these.
REQUIRED_VARS="HASS_URL HASS_TOKEN"
missing=""
for v in $REQUIRED_VARS; do
    if [ -z "${!v:-}" ]; then missing="${missing} ${v}"; fi
done
if [ -n "$missing" ]; then
    fail "Missing required .env variable(s):${missing}"
    exit 1
fi

# Soft requirements: warn but continue (these degrade gracefully).
#   TS_AUTHKEY   only needed if Tailscale is not already connected
#   CF_*         tunnel can be wired later (manual creation step)
#   B2_*         ha-core skips backups when absent
for v in CF_TUNNEL_TOKEN B2_KEY_ID B2_APP_KEY B2_BUCKET; do
    if [ -z "${!v:-}" ]; then warn "Optional .env variable ${v} is empty -- related feature will be skipped."; fi
done

# ============================================================
# [1/10] Prerequisites
# ============================================================
step 1 "$TOTAL_STEPS" "Base packages and repo ownership"
sudo apt-get update -y -qq
# build-essential + python3 let better-sqlite3 compile if no arm64 prebuild.
# unzip is used by 03-deploy-pi.ps1 to unpack the repo. jq is a small helper.
sudo apt-get install -y -qq ca-certificates curl gnupg unzip jq build-essential python3 git
ok "Base packages present"

# Repo is SCP'd to /opt (root-owned). Hand it to the current user so
# npm ci / build can write node_modules and dist without sudo.
if [ "$(stat -c '%U' "$REPO_DIR")" != "$(id -un)" ]; then
    info "Taking ownership of ${REPO_DIR}"
    sudo chown -R "$(id -un):$(id -gn)" "$REPO_DIR"
fi
ok "Repo owned by $(id -un)"

# ============================================================
# [2/10] Docker Engine + Compose plugin (official apt repo)
# ============================================================
step 2 "$TOTAL_STEPS" "Docker Engine + Compose plugin"
if command -v docker >/dev/null 2>&1 && sudo docker compose version >/dev/null 2>&1; then
    ok "Docker and Compose plugin already installed -- skipping"
else
    info "Adding Docker official apt repository (arm64 Bookworm)"
    sudo install -m 0755 -d /etc/apt/keyrings
    if [ ! -f /etc/apt/keyrings/docker.asc ]; then
        sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
        sudo chmod a+r /etc/apt/keyrings/docker.asc
    fi
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y -qq
    sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker "$(id -un)"
    info "Added $(id -un) to the docker group (effective on next login)"
    ok "Docker installed"
fi

# ============================================================
# [3/10] Home Assistant (Container, network_mode: host)
# ============================================================
step 3 "$TOTAL_STEPS" "Home Assistant container"
# IMPORTANT: network_mode: host is correct on Linux. NEVER use it on
# Docker Desktop for Windows (that needs explicit port mapping).
mkdir -p "${HA_DIR}/config"
cat > "${HA_DIR}/docker-compose.yml" <<EOF
services:
  homeassistant:
    container_name: homeassistant
    image: ghcr.io/home-assistant/home-assistant:stable
    volumes:
      - ${HA_DIR}/config:/config
      - /etc/localtime:/etc/localtime:ro
    restart: unless-stopped
    network_mode: host
    environment:
      - TZ=${TZ_VALUE}
EOF
ok "Wrote ${HA_DIR}/docker-compose.yml"
if sudo docker ps --format '{{.Names}}' | grep -q '^homeassistant$'; then
    ok "Home Assistant container already running"
else
    info "Starting Home Assistant (first pull can take a few minutes)"
    sudo docker compose -f "${HA_DIR}/docker-compose.yml" up -d
    ok "Home Assistant container started on :8123"
fi

# ============================================================
# [4/10] Node 20 LTS via nvm + workspace dependencies
# ============================================================
step 4 "$TOTAL_STEPS" "Node ${NODE_MAJOR} LTS and npm ci"
export NVM_DIR="${HOME}/.nvm"
if [ ! -s "${NVM_DIR}/nvm.sh" ]; then
    info "Installing nvm ${NVM_VERSION}"
    curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
fi
# nvm.sh references unset vars; relax -u only while sourcing/using it.
set +u
# shellcheck disable=SC1091
. "${NVM_DIR}/nvm.sh"
if [ "$(node -v 2>/dev/null | cut -d. -f1)" != "v${NODE_MAJOR}" ]; then
    info "Installing Node ${NODE_MAJOR}"
    nvm install "${NODE_MAJOR}"
fi
nvm alias default "${NODE_MAJOR}" >/dev/null
nvm use "${NODE_MAJOR}" >/dev/null
set -u
NODE_BIN="$(command -v node)"
NODE_BIN_DIR="$(dirname "$NODE_BIN")"
ok "Node $(node -v) at ${NODE_BIN}"

info "Installing workspace dependencies (npm ci)"
( cd "$REPO_DIR" && npm ci )
ok "Dependencies installed"

# ============================================================
# [5/10] nginx + site config
# ============================================================
step 5 "$TOTAL_STEPS" "nginx"
if ! dpkg -s nginx >/dev/null 2>&1; then
    info "Installing nginx"
    sudo apt-get install -y -qq nginx
fi
sudo cp "${REPO_DIR}/setup/pi/nginx/smarthome.conf" /etc/nginx/sites-available/smarthome.conf
sudo ln -sf /etc/nginx/sites-available/smarthome.conf /etc/nginx/sites-enabled/smarthome.conf
sudo rm -f /etc/nginx/sites-enabled/default
if sudo nginx -t 2>/dev/null; then
    ok "nginx config valid (reload deferred until app dist exists)"
else
    fail "nginx -t reported a config error in smarthome.conf"
    sudo nginx -t || true
    exit 1
fi

# ============================================================
# [6/10] Tailscale
# ============================================================
step 6 "$TOTAL_STEPS" "Tailscale"
if ! command -v tailscale >/dev/null 2>&1; then
    info "Installing Tailscale"
    curl -fsSL https://tailscale.com/install.sh | sh
fi
if tailscale status >/dev/null 2>&1; then
    ok "Tailscale already connected -- skipping login"
else
    if [ -z "${TS_AUTHKEY:-}" ]; then
        fail "Tailscale is not connected and TS_AUTHKEY is empty in .env. Set it or run 'sudo tailscale up' manually."
        exit 1
    fi
    info "Bringing Tailscale up with auth key (Tailscale SSH enabled)"
    sudo tailscale up --authkey "${TS_AUTHKEY}" --accept-routes --ssh --hostname "$(hostname)"
    ok "Tailscale connected"
fi

# ============================================================
# [7/10] cloudflared (install + token-based service stub)
# ============================================================
step 7 "$TOTAL_STEPS" "cloudflared"
if ! command -v cloudflared >/dev/null 2>&1; then
    info "Installing cloudflared (arm64 .deb)"
    curl -fsSL --output /tmp/cloudflared.deb \
        https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
    sudo dpkg -i /tmp/cloudflared.deb
    rm -f /tmp/cloudflared.deb
fi
if systemctl list-unit-files 2>/dev/null | grep -q '^cloudflared\.service'; then
    ok "cloudflared service already installed -- skipping"
elif [ -n "${CF_TUNNEL_TOKEN:-}" ]; then
    info "Installing cloudflared service from CF_TUNNEL_TOKEN"
    sudo cloudflared service install "${CF_TUNNEL_TOKEN}"
    sudo systemctl enable --now cloudflared
    ok "cloudflared service running"
else
    warn "CF_TUNNEL_TOKEN empty. Binary installed; create the tunnel and"
    warn "install the service manually (see PI_SETUP.md Manual Steps)."
fi

# ============================================================
# [8/10] ha-core systemd service (port 3001)
# ============================================================
step 8 "$TOTAL_STEPS" "ha-core systemd service"
sudo tee /etc/systemd/system/ha-core.service > /dev/null <<EOF
[Unit]
Description=Smart Home ha-core API (port 3001)
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=$(id -un)
WorkingDirectory=${REPO_DIR}/packages/ha-core
EnvironmentFile=${ENV_FILE}
Environment=NODE_ENV=production
Environment=PATH=${NODE_BIN_DIR}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=${NODE_BIN} src/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
ok "Wrote /etc/systemd/system/ha-core.service"
sudo systemctl daemon-reload
sudo systemctl enable ha-core >/dev/null 2>&1 || true
sudo systemctl restart ha-core
sleep 2
if systemctl is-active --quiet ha-core; then
    ok "ha-core service active on :3001"
else
    fail "ha-core failed to start. Inspect: sudo journalctl -u ha-core -n 50 --no-pager"
    exit 1
fi

# ============================================================
# [9/10] Build client-app and operator-app + reload nginx
# ============================================================
step 9 "$TOTAL_STEPS" "Build PWAs and serve via nginx"
info "Building client-app"
( cd "$REPO_DIR" && npm run build -w packages/client-app )
ok "client-app built -> packages/client-app/dist"

info "Building operator-app"
( cd "$REPO_DIR" && npm run build -w packages/operator-app )
ok "operator-app built -> packages/operator-app/dist"

sudo systemctl reload nginx 2>/dev/null || sudo systemctl restart nginx
ok "nginx serving client-app (:80) and operator-app (:3002)"

# ============================================================
# [10/10] Mode-specific configuration
# ============================================================
step 10 "$TOTAL_STEPS" "Mode-specific configuration (${MODE})"
CONFIG_YAML="${HA_DIR}/config/configuration.yaml"

if [ "$MODE" = "home" ]; then
    # ---- HOME: disabled ops-agent stub + Claude Code reachable ----
    info "Installing the DISABLED ops-agent stub (home Pi only)"
    sudo cp "${REPO_DIR}/setup/pi/ops-agent.service.example" /etc/systemd/system/ops-agent.service
    sudo systemctl daemon-reload
    # Mask so it can never start accidentally. Enabling is a future
    # deliberate action AFTER the agent script is written.
    sudo systemctl mask ops-agent >/dev/null 2>&1 || true
    ok "ops-agent installed, masked, and disabled"

    info "Installing Claude Code (home Pi only, reachable via Tailscale SSH)"
    if command -v claude >/dev/null 2>&1; then
        ok "Claude Code already installed -- skipping"
    else
        npm install -g @anthropic-ai/claude-code >/dev/null 2>&1 \
            && ok "Claude Code installed" \
            || warn "Claude Code global install failed -- install manually later if needed"
    fi
    info "demo: integration is allowed on the home Pi (test entities)."
else
    # ---- CLIENT: assert NO ops-agent, NO Claude Code, NO demo: ----
    if [ -f /etc/systemd/system/ops-agent.service ]; then
        warn "Found ops-agent unit on a CLIENT device -- removing it"
        sudo systemctl mask ops-agent >/dev/null 2>&1 || true
        sudo rm -f /etc/systemd/system/ops-agent.service
        sudo systemctl daemon-reload
    fi
    ok "No ops-agent on client device"

    # demo: must never reach a client. Strip it if a copied config has it.
    if [ -f "$CONFIG_YAML" ] && grep -Eq '^[[:space:]]*demo:' "$CONFIG_YAML"; then
        warn "demo: found in configuration.yaml on a CLIENT device -- removing it"
        sudo sed -i -E '/^[[:space:]]*demo:[[:space:]]*$/d' "$CONFIG_YAML"
        info "Restart HA to apply: sudo docker restart homeassistant"
    fi
    if [ -f "$CONFIG_YAML" ] && grep -Eq '^[[:space:]]*demo:' "$CONFIG_YAML"; then
        fail "demo: is STILL present in ${CONFIG_YAML}. Remove it before handover."
        exit 1
    fi
    ok "Asserted demo: is absent from configuration.yaml"
    info "Claude Code and dev tooling intentionally NOT installed on client."
fi

# ------------------------------------------------------------
# Done
# ------------------------------------------------------------
section "Pi setup complete (v${SCRIPT_VERSION}, mode=${MODE})"
info "client-app : http://$(hostname -I | awk '{print $1}')/"
info "operator   : http://$(hostname -I | awk '{print $1}'):3002/"
info "ha-core    : http://127.0.0.1:3001/health (proxied via /api)"
info "Home Assistant: http://$(hostname -I | awk '{print $1}'):8123/"
info ""
info "Manual steps remaining (see PI_SETUP.md):"
info "  - Complete the HA onboarding wizard and create the long-lived token"
info "  - Create the Cloudflare tunnel and confirm the public hostname"
info "  - Approve the device in the Tailscale admin console if required"
