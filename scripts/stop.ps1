#Requires -Version 5.1
<#
.SYNOPSIS
    Kill all Smarthome Platform dev processes by port.
#>

function Stop-Port([int]$port, [string]$label) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) {
        Write-Host ("  {0,-14} (port {1}): not running" -f $label, $port) -ForegroundColor DarkGray
        return
    }
    foreach ($conn in $conns) {
        try {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction Stop
            Write-Host ("  {0,-14} (port {1}): stopped PID {2}" -f $label, $port, $conn.OwningProcess) -ForegroundColor Green
        } catch {
            Write-Host ("  {0,-14} (port {1}): could not stop PID {2} -- {3}" -f $label, $port, $conn.OwningProcess, $_) -ForegroundColor Red
        }
    }
}

$ScriptDir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot  = Split-Path -Parent $ScriptDir
$logDir       = Join-Path $ProjectRoot 'logs'
$staleLogsFile = Join-Path $ProjectRoot '.stale-logs'

# ── Clear any stale logs from previous runs ───────────────────────────────────
if (Test-Path $staleLogsFile) {
    Get-Content $staleLogsFile | ForEach-Object {
        if (Test-Path $_) { try { Remove-Item $_ -Force } catch {} }
    }
    Remove-Item $staleLogsFile -Force
}

Write-Host ''
Write-Host 'Stopping Smarthome Platform dev services...' -ForegroundColor Cyan
Stop-Port 3001 'ha-core'
Stop-Port 5173 'client-app'
Stop-Port 3002 'operator-app'

$orphans = Get-Process -Name 'node' -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowTitle -eq '' }
if ($orphans) {
    $orphans | Stop-Process -Force
    Write-Host ("  killed {0} orphaned node process(es)" -f @($orphans).Count) -ForegroundColor DarkGray
}

# ── Wait for handles to release before deleting logs ─────────────────────────
Start-Sleep -Milliseconds 500

if (Test-Path $logDir) {
    $staleLogs = @()
    Get-ChildItem -Path $logDir -Filter '*.log' -ErrorAction SilentlyContinue |
        ForEach-Object {
            try {
                Remove-Item $_.FullName -Force -ErrorAction Stop
            } catch {
                $staleLogs += $_.FullName
            }
        }
    if ($staleLogs.Count -gt 0) {
        $staleLogs | Set-Content $staleLogsFile -Encoding utf8
        Write-Host ("  {0} log file(s) still locked -- queued for deletion on next run" -f $staleLogs.Count) -ForegroundColor DarkGray
    } else {
        Write-Host '  log files cleared' -ForegroundColor DarkGray
    }
}
Write-Host ''
