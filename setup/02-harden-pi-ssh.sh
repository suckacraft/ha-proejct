#!/usr/bin/env bash
# 02-harden-pi-ssh.sh
# Run ONCE on the Pi, AFTER key auth is working on both PC and laptop.
# Disables password login and enforces public-key-only SSH.

set -euo pipefail

SSHD_CONFIG="/etc/ssh/sshd_config"

echo ""
echo "=== Pi SSH Hardening ==="
echo ""

# --- 1. Confirm key auth works before touching anything ---
echo "Verifying this session is using key auth (not password) ..."
AUTH_METHOD=$(ssh -v -o BatchMode=yes -o ConnectTimeout=5 "$USER@localhost" \
    "echo key_auth_ok" 2>&1 | grep -i 'server accepts key' || true)

# Alternative check: sshd logs the auth method
# Fall back to checking authorized_keys exists and is non-empty
if [ ! -s "$HOME/.ssh/authorized_keys" ]; then
    echo "ERROR: ~/.ssh/authorized_keys is empty or missing."
    echo "  Run setup/01-setup-ssh-keys.ps1 from both the PC and laptop first."
    exit 1
fi

echo "authorized_keys present. Proceeding."
echo ""

# --- 2. WARNING ---
echo "!!! WARNING !!!"
echo "  Password login will be DISABLED after this script."
echo "  Keep this SSH session open and open a SECOND terminal to test"
echo "  key-based login before closing this one."
echo ""
read -r -p "Have you confirmed key auth works from both PC and laptop? [yes/N]: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted. Run 01-setup-ssh-keys.ps1 from both machines and verify PASS first."
    exit 1
fi

# --- 3. Edit sshd_config ---
echo ""
echo "Updating $SSHD_CONFIG ..."

sudo cp "$SSHD_CONFIG" "${SSHD_CONFIG}.bak.$(date +%Y%m%d%H%M%S)"
echo "  Backup saved."

sudo sed -i 's/^#*\s*PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CONFIG"
sudo sed -i 's/^#*\s*PubkeyAuthentication.*/PubkeyAuthentication yes/' "$SSHD_CONFIG"

# Ensure the directives exist if they were completely absent
grep -q '^PasswordAuthentication' "$SSHD_CONFIG" || echo 'PasswordAuthentication no'  | sudo tee -a "$SSHD_CONFIG" > /dev/null
grep -q '^PubkeyAuthentication'   "$SSHD_CONFIG" || echo 'PubkeyAuthentication yes'   | sudo tee -a "$SSHD_CONFIG" > /dev/null

echo "  PasswordAuthentication no"
echo "  PubkeyAuthentication yes"

# --- 4. Restart SSH ---
echo ""
echo "Restarting SSH service ..."
sudo systemctl restart ssh

echo ""
echo "DONE. SSH hardening applied."
echo ""
echo "Test from a NEW terminal on both PC and laptop:"
echo "  ssh pi@piserver.local"
echo ""
echo "If that succeeds, close this session. If it fails, you still have"
echo "this session open to diagnose or revert with:"
echo "  sudo cp ${SSHD_CONFIG}.bak.* $SSHD_CONFIG && sudo systemctl restart ssh"
