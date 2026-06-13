#!/usr/bin/env bash
# Deploy ha-core to the Pi. Run from the repo root:
#   npm run deploy:pi   OR   ./scripts/deploy-pi.sh

set -euo pipefail

PI_HOST="joshsaka@192.168.0.26"
PI_DIR="~/ha-core/"

echo "=== Deploying ha-core to Pi ==="

# ha-core has no build step (scripts: dev, start, test only -- no tsc/esbuild).

# Rsync source to the Pi. .env is always excluded so the Pi's secrets are
# never overwritten by a deploy.
echo "Syncing packages/ha-core/ -> $PI_HOST:$PI_DIR ..."
rsync -avz --delete \
    --exclude='node_modules/' \
    --exclude='.env' \
    --exclude='*.log' \
    packages/ha-core/ \
    "$PI_HOST:$PI_DIR"

# Install production dependencies on the Pi
echo "Installing production dependencies..."
ssh "$PI_HOST" "cd ~/ha-core && npm install --production"

# Restart the PM2 process
echo "Restarting ha-core via PM2..."
ssh "$PI_HOST" "pm2 restart ha-core"

echo "✓ ha-core deployed and restarted on Pi"
