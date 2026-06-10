# ============================================================
# Smart Home Platform -- Persist Z: Drive Mapping v1.0
# Run on the LAPTOP (hooby). Maps Z: -> \\JOSH\smarthome and
# makes the mapping survive reboots using a stored credential
# so it never re-prompts. Reconnects silently if dropped.
# Idempotent: safe to run any number of times.
#
# Changelog:
# v1.0 - Initial release
# ============================================================

param(
    [string]$DriveLetter = "Z",
    [string]$UncPath     = "\\JOSH\smarthome",
    [string]$PcHost      = "JOSH",
    [string]$PcUser      = "JOSH\Josh"
)

$ScriptVersion = "1.0"
$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# Helpers (mirror setup-dev-environment.ps1 style)
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

function Write-OK($text)   { Write-Host "      OK: $text"    -ForegroundColor Green }
function Write-Info($text) { Write-Host "      $text"        -ForegroundColor Gray  }
function Write-Warn($text) { Write-Host "      WARN: $text"  -ForegroundColor Yellow }
function Write-Fail($text) {
    Write-Host ""
    Write-Host "      ERROR: $text" -ForegroundColor Red
    Write-Host ""
}

# ------------------------------------------------------------
# Banner
# ------------------------------------------------------------

Write-Section "Persist Z: Drive Mapping v$ScriptVersion"
Write-Info "Drive:  ${DriveLetter}: -> $UncPath"
Write-Info "Host:   $PcHost"
Write-Info "User:   $PcUser"

$drive = "${DriveLetter}:"

# ------------------------------------------------------------
# Step 1 -- Ensure a stored credential exists for the PC host
# ------------------------------------------------------------
# cmdkey stores the credential in Windows Credential Manager keyed
# on the target host. Once stored, net use reconnects without ever
# prompting again, including after a reboot.

Write-Step 1 4 "Checking stored credential for $PcHost"

$credList = cmdkey /list 2>$null | Out-String
$hasCred  = $credList -match [regex]::Escape($PcHost)

if ($hasCred) {
    Write-OK "Credential for $PcHost already stored -- not re-prompting"
} else {
    Write-Info "No stored credential found for $PcHost"
    Write-Info "Enter the PC ($PcHost) password once. It is saved to"
    Write-Info "Windows Credential Manager and will not be asked again."
    $cred = Get-Credential -UserName $PcUser -Message "Password for $PcUser on $PcHost"
    if (-not $cred) {
        Write-Fail "No credential entered. Cannot persist the mapping."
        exit 1
    }
    $plain = $cred.GetNetworkCredential().Password
    # cmdkey keyed on the bare host so it matches the UNC server name.
    cmdkey /add:$PcHost /user:$($cred.UserName) /pass:$plain | Out-Null
    $plain = $null
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "cmdkey failed to store the credential for $PcHost"
        exit 1
    }
    Write-OK "Credential for $PcHost stored in Credential Manager"
}

# ------------------------------------------------------------
# Step 2 -- Inspect the current mapping
# ------------------------------------------------------------

Write-Step 2 4 "Inspecting current ${drive} mapping"

$existing = net use $drive 2>$null | Out-String
$mappedToTarget = $false
$mappedElsewhere = $false

if ($LASTEXITCODE -eq 0 -and $existing) {
    if ($existing -match [regex]::Escape($UncPath)) {
        $mappedToTarget = $true
        Write-Info "${drive} currently maps to $UncPath"
    } else {
        $mappedElsewhere = $true
        Write-Warn "${drive} is mapped to a different target"
    }
} else {
    Write-Info "${drive} is not currently mapped"
}

# A mapping can exist but be in a disconnected/unavailable state after a
# reboot if the share was slow to come up. Probe the path to be sure.
$reachable = Test-Path $drive 2>$null

# ------------------------------------------------------------
# Step 3 -- (Re)create the persistent mapping if needed
# ------------------------------------------------------------

Write-Step 3 4 "Ensuring a healthy persistent mapping"

if ($mappedToTarget -and $reachable) {
    Write-OK "${drive} already mapped to $UncPath and reachable -- nothing to do"
} else {
    if ($mappedElsewhere -or $mappedToTarget) {
        Write-Info "Removing existing ${drive} mapping before remapping"
        net use $drive /delete /yes 2>$null | Out-Null
    }

    Write-Info "Mapping ${drive} -> $UncPath (persistent)"
    # /persistent:yes restores the mapping at logon. With the stored
    # credential from Step 1 this reconnects silently after a reboot.
    net use $drive $UncPath /persistent:yes 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "net use failed to map ${drive} to $UncPath. Is $PcHost online and sharing smarthome?"
        exit 1
    }
    Write-OK "${drive} mapped to $UncPath (persistent)"
}

# ------------------------------------------------------------
# Step 4 -- Verify
# ------------------------------------------------------------

Write-Step 4 4 "Verifying ${drive} is reachable"

if (Test-Path $drive) {
    Write-OK "${drive} is reachable"
    Write-Info "Mapping persists across reboots and reconnects without prompting."
} else {
    Write-Fail "${drive} is not reachable after mapping. Check that $PcHost is online."
    exit 1
}

Write-Section "Done"
Write-Info "Repo is available at ${drive}\"
