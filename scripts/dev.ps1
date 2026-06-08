#Requires -Version 5.1
<#
.SYNOPSIS
    Start all Smarthome Platform dev services.
.PARAMETER HassToken
    Long-lived HA token. If omitted, reads HASS_TOKEN from .env.local.
.PARAMETER HassUrl
    HA base URL. If omitted, reads HASS_URL from .env.local, then defaults to http://localhost:8123.
#>
param(
    [string]$HassToken,
    [string]$HassUrl
)

$ErrorActionPreference = 'Stop'
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# ── Load .env.local ──────────────────────────────────────────────────────────
$envFile = Join-Path $ProjectRoot '.env.local'
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$') {
            $key = $matches[1]; $val = $matches[2]
            if ($key -eq 'HASS_TOKEN' -and -not $HassToken) { $HassToken = $val }
            if ($key -eq 'HASS_URL'   -and -not $HassUrl)   { $HassUrl   = $val }
        }
    }
}
if (-not $HassUrl)   { $HassUrl = 'http://localhost:8123' }
if (-not $HassToken) {
    Write-Host 'ERROR: No HASS_TOKEN found. Pass -HassToken or add to .env.local' -ForegroundColor Red
    exit 1
}

# ── Helpers ──────────────────────────────────────────────────────────────────
function Test-Port([int]$port) {
    try {
        $tcp = [System.Net.Sockets.TcpClient]::new()
        $tcp.Connect('127.0.0.1', $port)
        $tcp.Close()
        return $true
    } catch { return $false }
}

function Clear-Port([int]$port) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
        try { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction Stop } catch {}
    }
}

function Start-Service([string]$title, [string]$workspace, [string]$logPath) {
    $inner = @"
`$host.UI.RawUI.WindowTitle = '$title'
Set-Location "$ProjectRoot"
`$env:HASS_URL   = "$HassUrl"
`$env:HASS_TOKEN = "$HassToken"
npm run dev -w $workspace *> "$logPath"
"@
    $bytes   = [System.Text.Encoding]::Unicode.GetBytes($inner)
    $encoded = [Convert]::ToBase64String($bytes)
    return Start-Process powershell -PassThru -ArgumentList '-NoExit', '-EncodedCommand', $encoded
}

# ── Set up logs directory ────────────────────────────────────────────────────
$logDir = Join-Path $ProjectRoot 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory $logDir | Out-Null }
Get-ChildItem -Path $logDir -Filter '*.log' -ErrorAction SilentlyContinue |
    ForEach-Object { try { Remove-Item $_.FullName -Force } catch {} }

# ── Check operator-app ───────────────────────────────────────────────────────
$operatorPkg   = "$ProjectRoot\packages\operator-app\package.json"
$operatorReady = Test-Path $operatorPkg

# ── Clear any existing processes on platform ports ───────────────────────────
Write-Host 'Clearing existing processes...' -ForegroundColor DarkGray
foreach ($port in @(3001, 5173, 5174, 5175, 5176, 3002)) { Clear-Port $port }

# ── Launch services ──────────────────────────────────────────────────────────
$svcProcs = @{}

$svcProcs['ha-core']    = Start-Service 'ha-core'    'packages/ha-core'    (Join-Path $logDir 'ha-core.log')
Start-Sleep -Milliseconds 300
$svcProcs['client-app'] = Start-Service 'client-app' 'packages/client-app' (Join-Path $logDir 'client-app.log')

if ($operatorReady) {
    Start-Sleep -Milliseconds 300
    $svcProcs['operator-app'] = Start-Service 'operator-app' 'packages/operator-app' (Join-Path $logDir 'operator-app.log')
}

# ── Write PIDs for management dashboard restart support ──────────────────────
$pidsFile = Join-Path $ProjectRoot '.pids'

function Write-Pids {
    $opPid = if ($script:svcProcs.ContainsKey('operator-app')) { $script:svcProcs['operator-app'].Id } else { $null }
    $map = [ordered]@{
        'ha-core'      = $null
        'client-app'   = $script:svcProcs['client-app'].Id
        'operator-app' = $opPid
    }
    $map | ConvertTo-Json | Set-Content $script:pidsFile -Encoding utf8
}

Write-Pids

# ── Status panel ─────────────────────────────────────────────────────────────
function Write-StatusPanel([string]$ha, [string]$client, [string]$operator) {
    $colors = @{ RUNNING = 'Green'; STARTING = 'Yellow'; FAILED = 'Red'; 'NOT BUILT' = 'DarkGray' }
    $line   = '=' * 52
    Write-Host ''
    Write-Host $line                                        -ForegroundColor Cyan
    Write-Host '  SMARTHOME PLATFORM -- DEV ENVIRONMENT'   -ForegroundColor White
    Write-Host $line                                        -ForegroundColor Cyan
    foreach ($row in @(
        [pscustomobject]@{ name = 'ha-core';      url = 'http://localhost:3001/health'; st = $ha }
        [pscustomobject]@{ name = 'client-app';   url = 'http://localhost:5173        '; st = $client }
        [pscustomobject]@{ name = 'operator-app'; url = 'http://localhost:3002        '; st = $operator }
    )) {
        $c = $colors[$row.st]; if (-not $c) { $c = 'Yellow' }
        Write-Host ("  {0,-14} {1}  " -f $row.name, $row.url) -NoNewline -ForegroundColor Gray
        Write-Host "[$($row.st)]" -ForegroundColor $c
    }
    Write-Host $line                                        -ForegroundColor Cyan
    Write-Host "  HA:            $HassUrl"                  -ForegroundColor Gray
    Write-Host $line                                        -ForegroundColor Cyan
    Write-Host '  Press Ctrl+C to stop all services'        -ForegroundColor DarkGray
    Write-Host ''
}

$opInitial = if ($operatorReady) { 'STARTING' } else { 'NOT BUILT' }
Write-StatusPanel 'STARTING' 'STARTING' $opInitial

# ── Wait 5 seconds then recheck ports ────────────────────────────────────────
Write-Host 'Waiting for services to start...' -ForegroundColor DarkGray
Start-Sleep -Seconds 5

$haStatus = if (Test-Port 3001) { 'RUNNING' } else { 'FAILED' }
$clStatus = if (Test-Port 5173) { 'RUNNING' } else { 'FAILED' }
$opStatus = if ($operatorReady) { if (Test-Port 3002) { 'RUNNING' } else { 'FAILED' } } else { 'NOT BUILT' }

Clear-Host
Write-StatusPanel $haStatus $clStatus $opStatus

# ── Open browser: manage dashboard first, then client-app after 2s ───────────
if ($haStatus -eq 'RUNNING') { Start-Process 'http://localhost:3001/manage' }
if ($clStatus -eq 'RUNNING') {
    Start-Sleep -Seconds 2
    Start-Process 'http://localhost:5173'
}

# ── Watch loop: auto-relaunch client-app / operator-app on exit ──────────────
$svcConfig = @{
    'client-app'   = @{ port = 5173; workspace = 'packages/client-app' }
    'operator-app' = @{ port = 3002; workspace = 'packages/operator-app' }
}

try {
    while ($true) {
        Start-Sleep -Seconds 2

        foreach ($svcName in @('client-app', 'operator-app')) {
            if (-not $svcProcs.ContainsKey($svcName)) { continue }
            if (-not $svcProcs[$svcName].HasExited)   { continue }

            Write-Host "  [$svcName] exited - relaunching..." -ForegroundColor Yellow
            $cfg = $svcConfig[$svcName]
            Clear-Port $cfg.port
            Start-Sleep -Milliseconds 500
            $svcProcs[$svcName] = Start-Service $svcName $cfg.workspace (Join-Path $logDir "$svcName.log")
            Write-Pids
        }
    }
} finally {
    Write-Host ''
    Write-Host 'Stopping services...' -ForegroundColor Yellow
    foreach ($entry in $svcProcs.GetEnumerator()) {
        try {
            if (-not $entry.Value.HasExited) {
                Stop-Process -Id $entry.Value.Id -Force
                Write-Host "  Stopped $($entry.Key) PID $($entry.Value.Id)" -ForegroundColor Gray
            }
        } catch {}
    }
    if (Test-Path $pidsFile) { Remove-Item $pidsFile -Force }
    Write-Host 'Done.' -ForegroundColor Green
}
