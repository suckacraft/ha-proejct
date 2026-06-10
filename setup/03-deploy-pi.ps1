# ============================================================
# Smart Home Platform -- Deploy to Pi v1.0
# Run on the LAPTOP (hooby). Full deployment orchestrator:
#   1. Wait for the Pi to be reachable (ping loop)
#   2. SSH into the PC and zip the repo (git archive, tracked files)
#   3. SCP the zip PC -> laptop -> Pi
#   4. SCP the populated .env to the Pi
#   5. SSH into the Pi: unzip, chmod +x, run pi-setup.sh in the
#      chosen mode, streaming its output back here in real time
#
# Source of truth is the PC (JOSH). Development is on the laptop.
# The Pi (piserver) is production and is never edited directly.
#
# Usage:
#   .\03-deploy-pi.ps1 -Mode Home
#   .\03-deploy-pi.ps1 -Mode Client -PiIp 192.168.1.50
#
# PC_IP / PC_USER / PI_IP are read from setup/pi/.env unless
# given as parameters. 01-enable-ssh-on-pc.ps1 prints PC_IP/PC_USER.
#
# Changelog:
#   v1.0 - Initial release
# ============================================================

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Home", "Client")]
    [string]$Mode,

    [string]$PiIp,
    [string]$PcIp,
    [string]$PcUser,
    [string]$PiUser     = "pi",
    [string]$EnvFile    = "$PSScriptRoot\pi\.env",
    [string]$PcRepoPath = "",
    [int]$PiWaitMinutes = 10
)

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

# Fail with a distinct, named exit code so callers can tell phases apart.
function Stop-Deploy($name, $code) {
    Write-Fail "$name"
    exit $code
}

# Read a KEY=VALUE from a dotenv-style file (first match wins, ignores comments).
function Get-DotEnvValue($file, $key) {
    if (-not (Test-Path $file)) { return $null }
    foreach ($line in Get-Content -LiteralPath $file) {
        $trimmed = $line.Trim()
        if ($trimmed -eq "" -or $trimmed.StartsWith("#")) { continue }
        $eq = $trimmed.IndexOf("=")
        if ($eq -lt 1) { continue }
        $k = $trimmed.Substring(0, $eq).Trim()
        if ($k -eq $key) {
            return $trimmed.Substring($eq + 1).Trim()
        }
    }
    return $null
}

$TOTAL = 5

# ------------------------------------------------------------
# Banner + resolve configuration
# ------------------------------------------------------------
Write-Section "Deploy to Pi v$ScriptVersion"
Write-Info "Mode: $Mode"

# Verify the OpenSSH client is available on the laptop.
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Stop-Deploy "OpenSSH client not found. Install it: Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0" 10
}

# Resolve PC_IP / PC_USER / PI_IP: parameters override .env.
if (-not $PcIp)   { $PcIp   = Get-DotEnvValue $EnvFile "PC_IP" }
if (-not $PcUser) { $PcUser = Get-DotEnvValue $EnvFile "PC_USER" }
if (-not $PiIp)   { $PiIp   = Get-DotEnvValue $EnvFile "PI_IP" }

if (-not $PcIp)   { Stop-Deploy "PC_IP not set. Pass -PcIp or set PC_IP in $EnvFile." 11 }
if (-not $PcUser) { Stop-Deploy "PC_USER not set. Pass -PcUser or set PC_USER in $EnvFile." 11 }
if (-not $PiIp)   { Stop-Deploy "PI_IP not set. Pass -PiIp or set PI_IP in $EnvFile." 11 }

if (-not $PcRepoPath) {
    # Default to the documented PC repo location. Use forward slashes so
    # the path survives the SSH hop to the PC without quoting issues.
    $PcRepoPath = "C:/Users/$PcUser/smarthome-platform"
}
$PcZip    = "C:/Users/$PcUser/smarthome-deploy.zip"
$LocalZip = Join-Path $env:TEMP "smarthome-deploy.zip"

if (-not (Test-Path -LiteralPath $EnvFile)) {
    Stop-Deploy "Secrets file not found: $EnvFile. Copy setup/pi/.env.example to setup/pi/.env and fill it in." 11
}

Write-Info "PC:  $PcUser@$PcIp  (repo: $PcRepoPath)"
Write-Info "Pi:  $PiUser@$PiIp"
Write-Info "Env: $EnvFile"

$ModeLower = $Mode.ToLower()

# ------------------------------------------------------------
# [1/5] Wait for the Pi to be reachable
# ------------------------------------------------------------
Write-Step 1 $TOTAL "Waiting for the Pi at $PiIp"
$deadline = (Get-Date).AddMinutes($PiWaitMinutes)
$reachable = $false
while (-not $reachable) {
    if (Test-Connection -ComputerName $PiIp -Count 1 -Quiet -ErrorAction SilentlyContinue) {
        $reachable = $true
        break
    }
    if ((Get-Date) -gt $deadline) {
        Stop-Deploy "Pi did not respond to ping within $PiWaitMinutes minute(s). Check power and network." 20
    }
    Write-Info "Not up yet -- retrying in 5s..."
    Start-Sleep -Seconds 5
}
Write-OK "Pi is reachable"

# ------------------------------------------------------------
# [2/5] SSH into the PC and zip the repo (git archive)
# ------------------------------------------------------------
Write-Step 2 $TOTAL "Zipping the repo on the PC ($PcRepoPath)"
# git archive emits a clean zip of tracked files only: no node_modules,
# no dist, no gitignored .env. Deploys committed state by design.
$pcCmd = "git -C $PcRepoPath archive --format=zip -o $PcZip HEAD"
& ssh "$PcUser@$PcIp" $pcCmd
if ($LASTEXITCODE -ne 0) {
    Stop-Deploy "Failed to zip the repo on the PC. Is SSH enabled (01-enable-ssh-on-pc.ps1), is git installed, and is $PcRepoPath correct?" 21
}
Write-OK "Repo archived to $PcZip on the PC"

# ------------------------------------------------------------
# [3/5] Copy the zip PC -> laptop -> Pi
# ------------------------------------------------------------
Write-Step 3 $TOTAL "Transferring the repo zip to the Pi"
if (Test-Path -LiteralPath $LocalZip) { Remove-Item -LiteralPath $LocalZip -Force }

& scp "${PcUser}@${PcIp}:$PcZip" $LocalZip
if ($LASTEXITCODE -ne 0) { Stop-Deploy "Failed to copy the zip from the PC to the laptop." 30 }
Write-OK "Zip pulled to the laptop ($LocalZip)"

& scp $LocalZip "${PiUser}@${PiIp}:~/smarthome-deploy.zip"
if ($LASTEXITCODE -ne 0) { Stop-Deploy "Failed to copy the zip from the laptop to the Pi." 31 }
Write-OK "Zip pushed to the Pi"

# ------------------------------------------------------------
# [4/5] Copy the populated .env to the Pi
# ------------------------------------------------------------
Write-Step 4 $TOTAL "Transferring the .env secrets to the Pi"
& scp $EnvFile "${PiUser}@${PiIp}:~/smarthome.env"
if ($LASTEXITCODE -ne 0) { Stop-Deploy "Failed to copy .env to the Pi." 40 }
Write-OK ".env copied to the Pi"

# ------------------------------------------------------------
# [5/5] Unpack and run pi-setup.sh on the Pi (streamed live)
# ------------------------------------------------------------
Write-Step 5 $TOTAL "Running pi-setup.sh on the Pi (mode: $ModeLower)"

# Single-quoted so $(...) is evaluated by the remote shell, not PowerShell.
$piPrep = 'sudo mkdir -p /opt/smarthome-platform && sudo chown -R $(id -un):$(id -gn) /opt/smarthome-platform && unzip -o ~/smarthome-deploy.zip -d /opt/smarthome-platform >/dev/null && mv -f ~/smarthome.env /opt/smarthome-platform/.env && chmod +x /opt/smarthome-platform/setup/pi/*.sh && rm -f ~/smarthome-deploy.zip'
& ssh -t "$PiUser@$PiIp" $piPrep
if ($LASTEXITCODE -ne 0) {
    Stop-Deploy "Failed to unpack the repo on the Pi (unzip / .env placement / chmod)." 50
}
Write-OK "Repo unpacked to /opt/smarthome-platform on the Pi"

# -t allocates a tty so sudo prompts work and output streams in real time.
# Output is NOT captured into a variable -- it prints live to this console.
Write-Info "----- begin Pi output -----"
& ssh -t "$PiUser@$PiIp" "bash /opt/smarthome-platform/setup/pi/pi-setup.sh --mode $ModeLower"
$setupExit = $LASTEXITCODE
Write-Info "----- end Pi output -----"
if ($setupExit -ne 0) {
    Stop-Deploy "pi-setup.sh exited with code $setupExit on the Pi. See the streamed output above and: ssh $PiUser@$PiIp 'sudo journalctl -u ha-core -n 50 --no-pager'" 51
}

# ------------------------------------------------------------
# Done
# ------------------------------------------------------------
Write-Section "Deploy complete (mode: $Mode)"
Write-Info "client-app : http://$PiIp/"
Write-Info "operator   : http://${PiIp}:3002/"
Write-Info "Home Assistant: http://${PiIp}:8123/"
Write-Info ""
Write-Info "Remaining manual steps are listed at the end of the Pi output above"
Write-Info "and in setup/pi/PI_SETUP.md (HA token, Cloudflare tunnel, Tailscale approval)."

# Clean up the local temp zip.
if (Test-Path -LiteralPath $LocalZip) { Remove-Item -LiteralPath $LocalZip -Force }
