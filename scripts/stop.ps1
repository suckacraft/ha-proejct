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

Write-Host ''
Write-Host 'Stopping Smarthome Platform dev services...' -ForegroundColor Cyan
Stop-Port 3001 'ha-core'
Stop-Port 5173 'client-app'
Stop-Port 3002 'operator-app'
Write-Host ''
