# 01-setup-ssh-keys.ps1
# Run once on the PC (JOSH) and once on the laptop (hooby).
# Generates an ed25519 key if needed, copies it to the Pi, and tests the connection.
# Usage: .\01-setup-ssh-keys.ps1 [-PiTarget piserver.local]

param(
    [string]$PiTarget = 'piserver.local'
)

$PI_USER  = 'pi'
$KEY_PATH = "$env:USERPROFILE\.ssh\id_ed25519"
$PUB_PATH = "$KEY_PATH.pub"

Write-Host ""
Write-Host "=== SSH Key Setup for Pi ==="
Write-Host "Target : $PI_USER@$PiTarget"
Write-Host "Key    : $KEY_PATH"
Write-Host ""

# --- 1. Generate key if absent ---
if (-not (Test-Path $KEY_PATH)) {
    Write-Host "No ed25519 key found. Generating one now (no passphrase) ..."
    $sshDir = "$env:USERPROFILE\.ssh"
    if (-not (Test-Path $sshDir)) {
        New-Item -ItemType Directory -Path $sshDir | Out-Null
    }
    ssh-keygen -t ed25519 -f $KEY_PATH -N '""' -C "$env:USERNAME@$env:COMPUTERNAME"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: ssh-keygen failed. Is OpenSSH installed?"
        exit 1
    }
    Write-Host "Key generated."
} else {
    Write-Host "Existing key found: $KEY_PATH"
}

if (-not (Test-Path $PUB_PATH)) {
    Write-Host "ERROR: Public key not found at $PUB_PATH"
    exit 1
}

$pubKey = (Get-Content $PUB_PATH -Raw).Trim()
Write-Host ""
Write-Host "Public key:"
Write-Host "  $pubKey"
Write-Host ""

# --- 2. Copy public key to Pi (Windows has no ssh-copy-id) ---
Write-Host "Copying public key to $PI_USER@$PiTarget ..."
Write-Host "(You will be prompted for the Pi's password once.)"
Write-Host ""

# Ensure ~/.ssh exists with correct perms, then append the key
$remoteCmd = @"
mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$pubKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys
"@

ssh "$PI_USER@$PiTarget" $remoteCmd
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Could not copy key to Pi."
    Write-Host "  - Is the Pi reachable? Try: ping $PiTarget"
    Write-Host "  - Is SSH running on the Pi? (it should be enabled in Pi Imager)"
    Write-Host "  - If piserver.local fails, pass the IP directly:"
    Write-Host "      .\01-setup-ssh-keys.ps1 -PiTarget 192.168.0.X"
    exit 1
}

Write-Host ""
Write-Host "Key copied. Testing passwordless login ..."

# --- 3. Test ---
$testResult = ssh -o BatchMode=yes -o ConnectTimeout=10 "$PI_USER@$PiTarget" "echo connected" 2>&1
if ($LASTEXITCODE -eq 0 -and $testResult -match 'connected') {
    Write-Host ""
    Write-Host "PASS - SSH key auth working for $PI_USER@$PiTarget on this machine."
    Write-Host ""
    Write-Host "REMINDER: Run this script once on each machine:"
    Write-Host "  PC (JOSH/hooby .21)    : .\setup\01-setup-ssh-keys.ps1"
    Write-Host "  Laptop (hooby .23)     : .\setup\01-setup-ssh-keys.ps1"
    Write-Host ""
    Write-Host "Once both machines pass, run setup/02-harden-pi-ssh.sh on the Pi."
} else {
    Write-Host ""
    Write-Host "FAIL - Key was copied but passwordless login did not work."
    Write-Host "  ssh output: $testResult"
    Write-Host "  Check ~/.ssh/authorized_keys permissions on the Pi (must be 600)."
    exit 1
}
