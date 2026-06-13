#!/usr/bin/env bash
# One-time PM2 setup on the Pi. Run from your machine:
#   ssh joshsaka@192.168.0.26 'bash -s' < scripts/pi-setup.sh

set -euo pipefail

PI_HOME="$HOME"

echo "=== ha-core PM2 setup ==="

# Install PM2 globally if not present
if ! command -v pm2 &>/dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

mkdir -p "$PI_HOME/ha-core"

# Write ecosystem config using .cjs so PM2 loads it as CommonJS regardless
# of the package "type":"module" field in ha-core/package.json
cat > "$PI_HOME/ha-core/ecosystem.config.cjs" << EOFCONFIG
module.exports = {
  apps: [{
    name: 'ha-core',
    script: 'npm',
    args: 'start',
    cwd: '$PI_HOME/ha-core',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOFCONFIG

echo "Ecosystem config written to $PI_HOME/ha-core/ecosystem.config.cjs"

# Start or restart ha-core
# On first run src/index.js may not exist yet; pm2 will keep retrying once
# code arrives via deploy-pi.sh, which is the intended behaviour.
if pm2 describe ha-core &>/dev/null; then
    pm2 restart ha-core
else
    pm2 start "$PI_HOME/ha-core/ecosystem.config.cjs" \
        || echo "Note: pm2 start failed (no code yet). Run npm run deploy:pi to push code; PM2 will auto-restart."
fi

# Register PM2 with systemd so it survives reboots.
# pm2 startup prints the sudo command to run; we capture and eval it.
STARTUP_CMD=$(pm2 startup systemd 2>&1 | grep "sudo env PATH" || true)
if [ -n "$STARTUP_CMD" ]; then
    echo "Installing PM2 systemd unit..."
    eval "$STARTUP_CMD"
else
    echo "Warning: could not detect PM2 startup command. Run 'pm2 startup systemd' manually."
fi

pm2 save

echo ""
echo "Setup complete."
echo ""
echo "Next steps:"
echo "  1. Populate the Pi's env file:"
echo "       scp packages/ha-core/.env.example joshsaka@192.168.0.26:~/ha-core/.env"
echo "       ssh joshsaka@192.168.0.26 'nano ~/ha-core/.env'"
echo "  2. Deploy code:"
echo "       npm run deploy:pi"
