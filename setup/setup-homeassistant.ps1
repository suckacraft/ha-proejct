# ============================================================
# Home Assistant Docker Setup Script
# Run this in PowerShell as Administrator
# ============================================================

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Home Assistant Docker Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------
# Step 1 -- Check Docker is running
# ------------------------------------------------------------
Write-Host "[1/5] Checking Docker is running..." -ForegroundColor Yellow

try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Host "      Docker is running." -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "      ERROR: Docker is not running or not installed." -ForegroundColor Red
    Write-Host "      Please open Docker Desktop and wait for it to fully start," -ForegroundColor Red
    Write-Host "      then run this script again." -ForegroundColor Red
    Write-Host ""
    exit 1
}

# ------------------------------------------------------------
# Step 2 -- Create folders
# ------------------------------------------------------------
Write-Host "[2/5] Creating Home Assistant config folder..." -ForegroundColor Yellow

$haPath = "C:\Users\$env:USERNAME\homeassistant"
$configPath = "$haPath\config"

New-Item -ItemType Directory -Force -Path $configPath | Out-Null
Write-Host "      Created: $haPath" -ForegroundColor Green

# ------------------------------------------------------------
# Step 3 -- Write docker-compose.yml
# ------------------------------------------------------------
Write-Host "[3/5] Writing docker-compose.yml..." -ForegroundColor Yellow

$composeContent = @"
services:
  homeassistant:
    container_name: homeassistant
    image: ghcr.io/home-assistant/home-assistant:stable
    volumes:
      - $configPath:/config
    restart: unless-stopped
    ports:
      - "8123:8123"
    environment:
      - TZ=Australia/Melbourne
"@

Set-Content -Path "$haPath\docker-compose.yml" -Value $composeContent
Write-Host "      Written: $haPath\docker-compose.yml" -ForegroundColor Green

# ------------------------------------------------------------
# Step 4 -- Stop any existing HA container and start fresh
# ------------------------------------------------------------
Write-Host "[4/5] Starting Home Assistant container..." -ForegroundColor Yellow

Set-Location $haPath

# Stop existing container if running
$existing = docker ps -a --filter "name=homeassistant" --format "{{.Names}}" 2>$null
if ($existing -eq "homeassistant") {
    Write-Host "      Stopping existing container..." -ForegroundColor Gray
    docker compose down | Out-Null
}

# Pull latest image and start
Write-Host "      Pulling latest HA image (this takes 2-5 minutes)..." -ForegroundColor Gray
docker compose pull
docker compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "      ERROR: Failed to start container." -ForegroundColor Red
    Write-Host "      Run 'docker compose logs' in $haPath for details." -ForegroundColor Red
    exit 1
}

Write-Host "      Container started." -ForegroundColor Green

# ------------------------------------------------------------
# Step 5 -- Wait for HA to be ready and confirm
# ------------------------------------------------------------
Write-Host "[5/5] Waiting for Home Assistant to initialise..." -ForegroundColor Yellow
Write-Host "      (This takes 60-90 seconds on first run)" -ForegroundColor Gray

$maxAttempts = 30
$attempt = 0
$ready = $false

while ($attempt -lt $maxAttempts -and -not $ready) {
    Start-Sleep -Seconds 5
    $attempt++
    Write-Host "      Checking... ($($attempt * 5)s)" -ForegroundColor Gray

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8123" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $ready = $true
        }
    } catch {
        # Not ready yet, keep waiting
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan

if ($ready) {
    Write-Host "  Home Assistant is running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Open this URL in your browser:" -ForegroundColor White
    Write-Host "  http://localhost:8123" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Next steps:" -ForegroundColor White
    Write-Host "  1. Complete the setup wizard in your browser" -ForegroundColor Gray
    Write-Host "  2. Go to Settings > Devices and Services" -ForegroundColor Gray
    Write-Host "  3. Add the Demo integration for test entities" -ForegroundColor Gray
    Write-Host "  4. Go to Profile > Security > Long-lived access tokens" -ForegroundColor Gray
    Write-Host "  5. Create a token named 'ha-core-dev' and save it" -ForegroundColor Gray
} else {
    Write-Host "  Container is running but HA hasn't responded yet." -ForegroundColor Yellow
    Write-Host "  Wait another minute then open: http://localhost:8123" -ForegroundColor White
    Write-Host "  If it still doesn't load, run: docker logs homeassistant" -ForegroundColor Gray
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Open browser automatically if HA is ready
if ($ready) {
    Write-Host "  Opening browser..." -ForegroundColor Gray
    Start-Process "http://localhost:8123"
}
