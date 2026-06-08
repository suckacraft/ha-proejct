#Requires -Version 5.1
<#
.SYNOPSIS
    Show current running state of all Smarthome Platform services.
#>

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$LogDir      = Join-Path $ProjectRoot 'logs'

function Test-Port([int]$port) {
    try {
        $tcp = [System.Net.Sockets.TcpClient]::new()
        $tcp.Connect('127.0.0.1', $port)
        $tcp.Close()
        return $true
    } catch { return $false }
}

function Show-Service([string]$label, [int]$port, [string]$logFile) {
    $running = Test-Port $port
    $status  = if ($running) { 'RUNNING' } else { 'STOPPED' }
    $color   = if ($running) { 'Green'   } else { 'DarkGray' }
    Write-Host ("  {0,-16} port {1}  " -f $label, $port) -NoNewline -ForegroundColor Gray
    Write-Host "[$status]" -ForegroundColor $color
    if ($running -and $logFile -and (Test-Path $logFile)) {
        $tail = Get-Content $logFile -Tail 3 -ErrorAction SilentlyContinue
        foreach ($l in $tail) {
            Write-Host "                   $l" -ForegroundColor DarkGray
        }
    }
}

$line = '=' * 52
Write-Host ''
Write-Host $line                                      -ForegroundColor Cyan
Write-Host '  SMARTHOME PLATFORM -- SERVICE STATUS'  -ForegroundColor White
Write-Host $line                                      -ForegroundColor Cyan
Show-Service 'ha-core'        3001 (Join-Path $LogDir 'ha-core.log')
Show-Service 'client-app'     5173 (Join-Path $LogDir 'client-app.log')
Show-Service 'operator-app'   3002 (Join-Path $LogDir 'operator-app.log')
Show-Service 'home-assistant' 8123 $null
Write-Host $line                                      -ForegroundColor Cyan
Write-Host ''
