# ============================================================
# Smart Home Platform -- Enable SSH on PC v1.0
# Run ONCE on the PC (JOSH) as Administrator.
# Installs OpenSSH Server, starts sshd, sets Automatic startup,
# adds port 22 firewall rule, prints IP and username.
# Idempotent: safe to run multiple times.
#
# Changelog:
# v1.0 - Initial release
# ============================================================

$ScriptVersion = "1.0"
$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

function Write-Section($text) {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
}

function Write-Step($num, $total, $text) {
    Write-Host ""
    Write-Host "[$num/$total] $text" -ForegroundColor Yellow
}

function Write-OK($text)   { Write-Host "      OK: $text"   -ForegroundColor Green  }
function Write-Info($text) { Write-Host "      $text"       -ForegroundColor Gray   }
function Write-Warn($text) { Write-Host "      WARN: $text" -ForegroundColor Yellow }
function Write-Fail($text) {
    Write-Host ""
    Write-Host "      ERROR: $text" -ForegroundColor Red
    Write-Host ""
}

# ------------------------------------------------------------
# Must run as Administrator
# ------------------------------------------------------------

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Fail "This script must be run as Administrator. Right-click PowerShell and choose 'Run as Administrator'."
    exit 1
}

# ------------------------------------------------------------
# Banner
# ------------------------------------------------------------

Write-Section "Enable SSH on PC v$ScriptVersion"
Write-Info "This runs on the PC (JOSH) -- not on your laptop."
Write-Info "After this completes, run 02-persist-z-drive.ps1 on your laptop."

# ------------------------------------------------------------
# Step 1 -- Install OpenSSH Server capability
# ------------------------------------------------------------

Write-Step 1 4 "Installing OpenSSH Server"

$capability = Get-WindowsCapability -Online -Name "OpenSSH.Server*" -ErrorAction SilentlyContinue
if (-not $capability) {
    Write-Fail "Could not query Windows capabilities. Ensure Windows Update service is running."
    exit 1
}

if ($capability.State -eq "Installed") {
    Write-OK "OpenSSH Server already installed -- skipping"
} else {
    Write-Info "Installing OpenSSH Server capability..."
    $result = Add-WindowsCapability -Online -Name "OpenSSH.Server~~~~0.0.1.0"
    if ($result.RestartNeeded) {
        Write-Warn "A restart may be needed after install. If sshd fails to start, reboot and re-run."
    }
    Write-OK "OpenSSH Server installed"
}

# ------------------------------------------------------------
# Step 2 -- Start sshd and set Automatic startup
# ------------------------------------------------------------

Write-Step 2 4 "Configuring sshd service"

$svc = Get-Service -Name sshd -ErrorAction SilentlyContinue
if (-not $svc) {
    Write-Fail "sshd service not found after install. Try rebooting and re-running this script."
    exit 1
}

if ($svc.StartType -ne "Automatic") {
    Write-Info "Setting sshd startup to Automatic..."
    Set-Service -Name sshd -StartupType Automatic
    Write-OK "sshd startup set to Automatic"
} else {
    Write-OK "sshd already set to Automatic"
}

if ($svc.Status -ne "Running") {
    Write-Info "Starting sshd..."
    Start-Service sshd
    Start-Sleep -Seconds 2
    $svc = Get-Service -Name sshd
    if ($svc.Status -ne "Running") {
        Write-Fail "sshd failed to start. Check Event Viewer > Windows Logs > System for details."
        exit 1
    }
    Write-OK "sshd started"
} else {
    Write-OK "sshd already running"
}

# ------------------------------------------------------------
# Step 3 -- Add port 22 inbound firewall rule
# ------------------------------------------------------------

Write-Step 3 4 "Configuring firewall rule for port 22"

$ruleName = "OpenSSH-Server-In-TCP"
$existingRule = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-OK "Firewall rule '$ruleName' already exists -- skipping"
} else {
    Write-Info "Adding inbound firewall rule for TCP port 22..."
    New-NetFirewallRule `
        -Name        $ruleName `
        -DisplayName "OpenSSH Server (sshd)" `
        -Enabled     True `
        -Direction   Inbound `
        -Protocol    TCP `
        -Action      Allow `
        -LocalPort   22 | Out-Null
    Write-OK "Firewall rule added: TCP port 22 inbound allowed"
}

# ------------------------------------------------------------
# Step 4 -- Print connection details
# ------------------------------------------------------------

Write-Step 4 4 "Connection details"

$username = $env:USERNAME
$ips = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.InterfaceAlias -notmatch "Loopback" -and $_.PrefixOrigin -ne "WellKnown" } |
        Select-Object -ExpandProperty IPAddress)

Write-Section "SSH is ready"
Write-Info "Username : $username"
Write-Info "IP(s)    :"
foreach ($ip in $ips) {
    Write-Info "           $ip"
}
Write-Info ""
Write-Info "From your laptop, test with:"
Write-Info "    ssh ${username}@<IP>"
Write-Info ""
Write-Info "Set PC_IP and PC_USER in your .env before running 03-deploy-pi.ps1:"
Write-Info "    PC_IP=$($ips | Select-Object -First 1)"
Write-Info "    PC_USER=$username"
