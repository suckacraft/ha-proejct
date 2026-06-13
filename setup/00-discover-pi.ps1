# 00-discover-pi.ps1
# Detects the Pi the moment it joins the network.
# Try mDNS first; if that fails, sweep ARP for Raspberry Pi OUIs.
# Usage: .\00-discover-pi.ps1 [-TimeoutSeconds 300]

param(
    [int]$TimeoutSeconds = 300
)

$PI_OUIS = @('B8:27:EB', 'DC:A6:32', 'E4:5F:01', '2C:CF:67', 'D8:3A:DD', '28:CD:C1')
$SUBNET  = '192.168.0'
$START   = 2
$END     = 254

function Normalize-Mac($raw) {
    # Normalise to XX:XX:XX:XX:XX:XX upper-case
    $raw -replace '-', ':' | ForEach-Object { $_.ToUpper() }
}

function Get-OuiPrefix($mac) {
    ($mac -split ':')[0..2] -join ':'
}

Write-Host ""
Write-Host "=== Pi Network Discovery ==="
Write-Host "Timeout: $TimeoutSeconds seconds"
Write-Host ""

# --- Step 1: try mDNS ---
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Trying mDNS: piserver.local ..."
try {
    $resolved = [System.Net.Dns]::GetHostAddresses('piserver.local') |
                Where-Object { $_.AddressFamily -eq 'InterNetwork' } |
                Select-Object -First 1
    if ($resolved) {
        $ip = $resolved.IPAddressToString
        Write-Host ""
        Write-Host "SUCCESS - Pi found via mDNS"
        Write-Host "  Hostname : piserver.local"
        Write-Host "  IP       : $ip"
        Write-Host ""
        Write-Host "NOTE: Record the Pi's MAC address from your router's DHCP table"
        Write-Host "      and set a static lease so the IP never changes."
        exit 0
    }
} catch { }

Write-Host "mDNS did not resolve. Starting ARP sweep (this may take a while)..."
Write-Host ""

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$attempt   = 0

while ($stopwatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
    $attempt++
    $elapsed = [int]$stopwatch.Elapsed.TotalSeconds
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Attempt $attempt  ($elapsed s elapsed) -- pinging $SUBNET.$START-$END ..."

    # Parallel ping sweep to populate the ARP cache
    $jobs = @()
    for ($i = $START; $i -le $END; $i++) {
        $ip = "$SUBNET.$i"
        $jobs += Start-Job -ScriptBlock {
            param($addr)
            ping -n 1 -w 200 $addr | Out-Null
        } -ArgumentList $ip
    }
    $jobs | Wait-Job | Out-Null
    $jobs | Remove-Job -Force

    # Read the ARP table
    $arpLines = arp -a | Select-String '\d+\.\d+\.\d+\.\d+'
    foreach ($line in $arpLines) {
        $parts = ($line.ToString().Trim() -split '\s+')
        if ($parts.Count -lt 2) { continue }
        $ip  = $parts[0]
        $mac = Normalize-Mac $parts[1]
        $oui = Get-OuiPrefix $mac

        foreach ($knownOui in $PI_OUIS) {
            if ($oui -eq $knownOui) {
                $elapsed2 = [int]$stopwatch.Elapsed.TotalSeconds
                Write-Host ""
                Write-Host "SUCCESS - Raspberry Pi found via ARP"
                Write-Host "  IP       : $ip"
                Write-Host "  MAC      : $mac"
                Write-Host "  Elapsed  : $elapsed2 s"
                Write-Host ""
                Write-Host "ACTION REQUIRED:"
                Write-Host "  Log into your router (192.168.0.1) and create a static DHCP"
                Write-Host "  lease binding MAC $mac to a fixed IP."
                Write-Host "  This prevents the Pi's address from changing after reboots."
                exit 0
            }
        }
    }

    $remaining = $TimeoutSeconds - [int]$stopwatch.Elapsed.TotalSeconds
    if ($remaining -gt 10) {
        Write-Host "  No Pi detected yet. Next attempt in 10 s  ($remaining s remaining)..."
        Start-Sleep -Seconds 10
    }
}

# --- Timeout ---
Write-Host ""
Write-Host "TIMEOUT - Pi not found after $TimeoutSeconds seconds."
Write-Host ""
Write-Host "=== ETHERNET FALLBACK INSTRUCTIONS ==="
Write-Host "  1. Plug the Pi directly into the router with an ethernet cable."
Write-Host "  2. Re-run this script:  .\setup\00-discover-pi.ps1"
Write-Host "  3. Once you have the IP, SSH in and fix WiFi headlessly:"
Write-Host "       ssh pi@<pi-ip>"
Write-Host "       nmcli device wifi list"
Write-Host "       sudo nmcli device wifi connect ""<SSID>"" password ""<password>"""
Write-Host "       nmcli connection show   # confirm the connection persists"
Write-Host "  4. Verify the Pi got a DHCP lease on wlan0:"
Write-Host "       ip addr show wlan0"
Write-Host "  See setup/PI_NETWORK_RECOVERY.md for the full guide."
exit 1
