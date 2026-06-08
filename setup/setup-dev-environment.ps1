# ============================================================
# Smart Home Platform -- Full Dev Environment Setup v1.2
# Installs all tools and starts Home Assistant
# Run in PowerShell as Administrator on a fresh Windows machine
#
# Changelog:
# v1.2 - Fixed ha-mcp config: uses hass-mcp npm package with
#        HASS_URL/HASS_TOKEN env vars (not HA_URL/HA_TOKEN)
#      - Fixed docker-compose: removed network_mode:host and
#        /etc/localtime volume (both break on Windows)
#      - Fixed filesystem MCP: uses actual username not placeholder
#      - Fixed ha-mcp JSON config written directly to .claude.json
#        to avoid Windows CLI env var syntax issues
#      - Added WSL install check before Docker
#      - Added Demo integration instructions to post-setup notes
#      - Skills install now targets claude-code agent specifically
# v1.1 - Added -y flag to npx skills commands
# v1.0 - Initial release
# ============================================================

param(
    [string]$HAConfigPath = "C:\Users\$env:USERNAME\homeassistant",
    [string]$ProjectPath = "C:\Users\$env:USERNAME\smarthome-platform",
    [switch]$SkipHA,
    [switch]$SkipSkills,
    [switch]$SkipMCP
)

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

function Write-OK($text) {
    Write-Host "      OK: $text" -ForegroundColor Green
}

function Write-Info($text) {
    Write-Host "      $text" -ForegroundColor Gray
}

function Write-Warn($text) {
    Write-Host "      WARN: $text" -ForegroundColor Yellow
}

function Write-Fail($text) {
    Write-Host ""
    Write-Host "      ERROR: $text" -ForegroundColor Red
    Write-Host ""
}

function Test-Command($cmd) {
    return [bool](Get-Command $cmd -ErrorAction SilentlyContinue)
}

function Install-WingetApp($id, $name) {
    Write-Info "Checking $name..."
    $installed = winget list --id $id 2>$null | Select-String $id
    if ($installed) {
        Write-OK "$name already installed -- skipping"
    } else {
        Write-Info "Installing $name..."
        winget install $id --silent --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Failed to install $name. Install manually and re-run."
            exit 1
        }
        Write-OK "$name installed"
    }
}

# ------------------------------------------------------------
# Check running as Administrator
# ------------------------------------------------------------

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Fail "This script must be run as Administrator. Right-click PowerShell and select Run as Administrator."
    exit 1
}

# ------------------------------------------------------------
# Check Windows version
# ------------------------------------------------------------

$winVer = [System.Environment]::OSVersion.Version
if ($winVer.Major -lt 10) {
    Write-Fail "Windows 10 or 11 required."
    exit 1
}

Write-Section "Smart Home Platform -- Dev Environment Setup v1.2"
Write-Host ""
Write-Host "  This script will install:" -ForegroundColor White
Write-Host "  - WSL (required for Docker on Windows)" -ForegroundColor Gray
Write-Host "  - Docker Desktop" -ForegroundColor Gray
Write-Host "  - Node.js LTS" -ForegroundColor Gray
Write-Host "  - Visual Studio Code + extensions" -ForegroundColor Gray
Write-Host "  - Git" -ForegroundColor Gray
Write-Host "  - Tailscale" -ForegroundColor Gray
Write-Host "  - Cloudflared CLI" -ForegroundColor Gray
Write-Host "  - Postman" -ForegroundColor Gray
Write-Host "  - Raspberry Pi Imager" -ForegroundColor Gray
Write-Host "  - MQTT Explorer" -ForegroundColor Gray
Write-Host "  - Claude Code CLI" -ForegroundColor Gray
Write-Host "  - Claude Code skills (HA best practices, find-skills)" -ForegroundColor Gray
Write-Host "  - hass-mcp registered in .claude.json (inactive until Stage 1)" -ForegroundColor Gray
Write-Host "  - Home Assistant in Docker" -ForegroundColor Gray
Write-Host ""
Write-Host "  Estimated time: 10-20 minutes depending on connection speed" -ForegroundColor Gray
Write-Host ""
Read-Host "  Press Enter to begin or Ctrl+C to cancel"

$totalSteps = 13

# ------------------------------------------------------------
# Step 1 -- WSL (required for Docker Desktop on Windows)
# ------------------------------------------------------------

Write-Step 1 $totalSteps "Checking WSL (required for Docker)..."

try {
    $wslOutput = wsl --status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-OK "WSL already installed"
    } else {
        throw "WSL not ready"
    }
} catch {
    Write-Info "Installing WSL (no Linux distribution, engine only)..."
    wsl --install --no-distribution
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor Yellow
    Write-Host "  WSL was just installed." -ForegroundColor Yellow
    Write-Host "  You may need to REBOOT before Docker works." -ForegroundColor Yellow
    Write-Host "  After rebooting, re-run this script." -ForegroundColor Yellow
    Write-Host "  ============================================" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "  If prompted to reboot, do so now then re-run. Otherwise press Enter to continue"
}

# ------------------------------------------------------------
# Step 2 -- Core tools via winget
# ------------------------------------------------------------

Write-Step 2 $totalSteps "Installing core tools..."

Install-WingetApp "Docker.DockerDesktop"                    "Docker Desktop"
Install-WingetApp "OpenJS.NodeJS.LTS"                       "Node.js LTS"
Install-WingetApp "Microsoft.VisualStudioCode"              "Visual Studio Code"
Install-WingetApp "Git.Git"                                 "Git"
Install-WingetApp "tailscale.tailscale"                     "Tailscale"
Install-WingetApp "Cloudflare.cloudflared"                  "Cloudflared CLI"
Install-WingetApp "Postman.Postman"                         "Postman"
Install-WingetApp "RaspberryPiFoundation.RaspberryPiImager" "Raspberry Pi Imager"
Install-WingetApp "thomasnordquist.MQTT-Explorer"           "MQTT Explorer"

Write-OK "All core tools installed"

# ------------------------------------------------------------
# Step 3 -- Refresh PATH
# ------------------------------------------------------------

Write-Step 3 $totalSteps "Refreshing PATH..."
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Write-OK "PATH refreshed"

# ------------------------------------------------------------
# Step 4 -- VS Code extensions
# ------------------------------------------------------------

Write-Step 4 $totalSteps "Installing VS Code extensions..."

$extensions = @(
    "ms-azuretools.vscode-docker",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "redhat.vscode-yaml"
)

foreach ($ext in $extensions) {
    Write-Info "Installing: $ext"
    code --install-extension $ext --force 2>$null
}

Write-OK "VS Code extensions installed"

# ------------------------------------------------------------
# Step 5 -- Claude Code
# ------------------------------------------------------------

Write-Step 5 $totalSteps "Installing Claude Code..."

if (Test-Command "claude") {
    Write-OK "Claude Code already installed"
} else {
    npm install -g @anthropic-ai/claude-code
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Claude Code install failed. Check Node.js is installed and try: npm install -g @anthropic-ai/claude-code"
        exit 1
    }
    Write-OK "Claude Code installed"
}

# ------------------------------------------------------------
# Step 6 -- Create project folder
# ------------------------------------------------------------

Write-Step 6 $totalSteps "Creating project folder..."
New-Item -ItemType Directory -Force -Path $ProjectPath | Out-Null
Write-OK "Project folder: $ProjectPath"

# ------------------------------------------------------------
# Step 7 -- Claude Code skills
# ------------------------------------------------------------

if (-not $SkipSkills) {
    Write-Step 7 $totalSteps "Installing Claude Code skills..."

    Set-Location $ProjectPath

    Write-Info "Installing home-assistant-best-practices (targeting claude-code agent)..."
    npx skills add https://github.com/homeassistant-ai/skills --skill home-assistant-best-practices -a claude-code -g -y
    Write-OK "home-assistant-best-practices installed"

    Write-Info "Installing find-skills (targeting claude-code agent)..."
    npx skills add https://github.com/vercel-labs/skills --skill find-skills -a claude-code -g -y
    Write-OK "find-skills installed"

    Write-Info "Cloning homeassistant-manager skill..."
    $skillsDir = "$env:USERPROFILE\.claude\skills"
    New-Item -ItemType Directory -Force -Path $skillsDir | Out-Null
    $managerPath = "$skillsDir\homeassistant-manager"
    if (Test-Path $managerPath) {
        Write-OK "homeassistant-manager already exists -- skipping"
    } else {
        git clone https://github.com/komal-SkyNET/claude-skill-homeassistant.git $managerPath
        Write-OK "homeassistant-manager cloned"
    }
} else {
    Write-Step 7 $totalSteps "Skipping skills (--SkipSkills flag set)"
}

# ------------------------------------------------------------
# Step 8 -- Filesystem MCP (uses actual username, not placeholder)
# ------------------------------------------------------------

Write-Step 8 $totalSteps "Registering filesystem MCP..."

# Remove any existing entry first to avoid duplicates
claude mcp remove filesystem 2>$null

# Add with correct path using actual username
$fsArgs = "@modelcontextprotocol/server-filesystem", $ProjectPath
claude mcp add filesystem npx -- @modelcontextprotocol/server-filesystem $ProjectPath --scope user 2>$null

# Write directly to .claude.json to bypass Windows CLI syntax issues
# This is more reliable than the CLI for project-scoped MCPs
$claudeJsonPath = "$env:USERPROFILE\.claude.json"
if (Test-Path $claudeJsonPath) {
    $claudeJson = Get-Content $claudeJsonPath -Raw | ConvertFrom-Json

    # Ensure smarthome-platform project entry exists
    $projectKey = "C:/Users/$env:USERNAME/smarthome-platform"
    if (-not $claudeJson.projects.$projectKey) {
        $claudeJson.projects | Add-Member -NotePropertyName $projectKey -NotePropertyValue ([PSCustomObject]@{
            allowedTools = @()
            mcpContextUris = @()
            mcpServers = [PSCustomObject]@{}
            enabledMcpjsonServers = @()
            disabledMcpjsonServers = @()
            hasTrustDialogAccepted = $false
            projectOnboardingSeenCount = 0
            hasClaudeMdExternalIncludesApproved = $false
            hasClaudeMdExternalIncludesWarningShown = $false
        }) -Force
    }

    # Add filesystem MCP
    $filesystemMcp = [PSCustomObject]@{
        type = "stdio"
        command = "npx"
        args = @("@modelcontextprotocol/server-filesystem", $ProjectPath.Replace("/", "\"))
        env = [PSCustomObject]@{}
    }
    $claudeJson.projects.$projectKey.mcpServers | Add-Member -NotePropertyName "filesystem" -NotePropertyValue $filesystemMcp -Force

    $claudeJson | ConvertTo-Json -Depth 20 | Set-Content $claudeJsonPath
    Write-OK "Filesystem MCP written to .claude.json"
} else {
    Write-Warn ".claude.json not found -- Claude Code may not have been run yet. Run 'claude' once then re-run this script."
}

# ------------------------------------------------------------
# Step 9 -- ha-mcp written to .claude.json
# NOTE: Uses hass-mcp npm package with HASS_URL/HASS_TOKEN vars
# NOT @homeassistant-ai/ha-mcp (that is a Python/HA addon, not npm)
# NOT HA_URL/HA_TOKEN (those are the wrong var names for hass-mcp)
# ------------------------------------------------------------

if (-not $SkipMCP) {
    Write-Step 9 $totalSteps "Registering ha-mcp in .claude.json (inactive -- needs HA token)..."

    if (Test-Path $claudeJsonPath) {
        $claudeJson = Get-Content $claudeJsonPath -Raw | ConvertFrom-Json
        $projectKey = "C:/Users/$env:USERNAME/smarthome-platform"

        $haMcp = [PSCustomObject]@{
            type = "stdio"
            command = "npx"
            args = @("-y", "hass-mcp")
            env = [PSCustomObject]@{
                HASS_URL = "http://localhost:8123"
                HASS_TOKEN = "REPLACE_WITH_YOUR_HA_TOKEN"
            }
        }
        $claudeJson.projects.$projectKey.mcpServers | Add-Member -NotePropertyName "ha-mcp" -NotePropertyValue $haMcp -Force
        $claudeJson | ConvertTo-Json -Depth 20 | Set-Content $claudeJsonPath
        Write-OK "ha-mcp registered (token placeholder -- update after HA setup)"
        Write-Warn "ha-mcp will fail until you replace REPLACE_WITH_YOUR_HA_TOKEN in .claude.json"
        Write-Info "After HA setup: code `$env:USERPROFILE\.claude.json and update the HASS_TOKEN value"
    }
} else {
    Write-Step 9 $totalSteps "Skipping MCP registration (--SkipMCP flag set)"
}

# ------------------------------------------------------------
# Step 10 -- GitHub MCP placeholder
# ------------------------------------------------------------

Write-Step 10 $totalSteps "GitHub MCP..."
Write-Info "Skipping -- add manually once you have a GitHub token:"
Write-Info "Edit .claude.json and add to smarthome-platform mcpServers:"
Write-Info '  "github": { "type": "stdio", "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"], "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "YOUR_TOKEN" } }'

# ------------------------------------------------------------
# Step 11 -- Start Docker Desktop
# ------------------------------------------------------------

Write-Step 11 $totalSteps "Starting Docker Desktop..."

$dockerRunning = $false
$dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue

if (-not $dockerProcess) {
    Write-Info "Launching Docker Desktop..."
    $dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerExe) {
        Start-Process $dockerExe
        Write-Info "Waiting for Docker to initialise (up to 90 seconds)..."
        $attempts = 0
        while ($attempts -lt 18) {
            Start-Sleep -Seconds 5
            $attempts++
            $result = docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                $dockerRunning = $true
                break
            }
            Write-Info "Waiting... ($($attempts * 5)s)"
        }
    } else {
        Write-Warn "Docker Desktop executable not found. Open it manually from the Start menu."
    }
} else {
    $result = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerRunning = $true
        Write-OK "Docker is already running"
    }
}

if ($dockerRunning) {
    Write-OK "Docker is ready"
} else {
    Write-Warn "Docker is not ready yet. Open Docker Desktop manually and wait for the whale icon to stop animating, then continue."
    Write-Info "Once Docker is running, start HA manually:"
    Write-Info "  cd $HAConfigPath && docker compose up -d"
    $SkipHA = $true
}

# ------------------------------------------------------------
# Step 12 -- Home Assistant
# IMPORTANT: Uses explicit port mapping, NOT network_mode:host
# network_mode:host does not work on Docker Desktop for Windows
# Also no /etc/localtime volume -- does not exist on Windows
# ------------------------------------------------------------

if (-not $SkipHA) {
    Write-Step 12 $totalSteps "Setting up Home Assistant..."

    $configPath = "$HAConfigPath\config"
    New-Item -ItemType Directory -Force -Path $configPath | Out-Null

    # Use forward slashes for Docker volume mount path
    $configPathDocker = $configPath.Replace("\", "/")

    $composeContent = @"
services:
  homeassistant:
    container_name: homeassistant
    image: ghcr.io/home-assistant/home-assistant:stable
    volumes:
      - ${configPathDocker}:/config
    restart: unless-stopped
    ports:
      - "8123:8123"
    environment:
      - TZ=Australia/Melbourne
"@

    Set-Content -Path "$HAConfigPath\docker-compose.yml" -Value $composeContent
    Write-OK "docker-compose.yml written (port mapping, no network_mode:host)"

    Set-Location $HAConfigPath

    $existing = docker ps -a --filter "name=homeassistant" --format "{{.Names}}" 2>$null
    if ($existing -match "homeassistant") {
        Write-Info "Stopping existing HA container..."
        docker compose down | Out-Null
    }

    Write-Info "Pulling latest HA image (2-5 minutes on first run)..."
    docker compose pull
    docker compose up -d

    if ($LASTEXITCODE -eq 0) {
        Write-OK "Home Assistant container started"
        Write-Info "Waiting for HA to initialise (up to 150 seconds)..."

        $maxAttempts = 30
        $attempt = 0
        $ready = $false

        while ($attempt -lt $maxAttempts -and -not $ready) {
            Start-Sleep -Seconds 5
            $attempt++
            Write-Info "Checking... ($($attempt * 5)s)"
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:8123" -TimeoutSec 5 -ErrorAction Stop
                if ($response.StatusCode -eq 200) { $ready = $true }
            } catch {}
        }

        if ($ready) {
            Write-OK "Home Assistant is live at http://localhost:8123"
            Start-Process "http://localhost:8123"
        } else {
            Write-Warn "HA container running but not responding yet. Try http://localhost:8123 in a minute."
            Write-Info "To debug: docker logs homeassistant"
        }
    } else {
        Write-Fail "HA container failed to start. Run: docker logs homeassistant"
    }
}

# ------------------------------------------------------------
# Step 13 -- Add Demo integration to HA config
# Demo integration requires configuration.yaml edit, not UI
# ------------------------------------------------------------

Write-Step 13 $totalSteps "Adding Demo integration to HA config..."

$haConfigYaml = "$HAConfigPath\config\configuration.yaml"
if (Test-Path $haConfigYaml) {
    $yamlContent = Get-Content $haConfigYaml -Raw
    if ($yamlContent -notmatch "^demo:") {
        Add-Content -Path $haConfigYaml -Value "`ndemo:"
        Write-OK "Demo integration added to configuration.yaml"
        Write-Info "Restart HA to load demo entities: docker restart homeassistant"
    } else {
        Write-OK "Demo integration already in configuration.yaml"
    }
} else {
    Write-Warn "configuration.yaml not found yet -- HA may still be initialising."
    Write-Info "After HA starts, add 'demo:' to $haConfigYaml and restart the container."
}

# ------------------------------------------------------------
# Summary
# ------------------------------------------------------------

Write-Section "Setup Complete"
Write-Host ""
Write-Host "  Installed and configured:" -ForegroundColor White
Write-Host "  - WSL, Docker Desktop, Node.js, VS Code, Git" -ForegroundColor Gray
Write-Host "  - Tailscale, Cloudflared, Postman" -ForegroundColor Gray
Write-Host "  - Raspberry Pi Imager, MQTT Explorer" -ForegroundColor Gray
Write-Host "  - Claude Code CLI" -ForegroundColor Gray
Write-Host "  - HA best practices + find-skills (claude-code agent)" -ForegroundColor Gray
Write-Host "  - filesystem MCP (active)" -ForegroundColor Gray
Write-Host "  - ha-mcp registered with token placeholder (inactive)" -ForegroundColor Gray
Write-Host "  - Home Assistant at http://localhost:8123" -ForegroundColor Gray
Write-Host "  - Demo integration added to configuration.yaml" -ForegroundColor Gray
Write-Host ""
Write-Host "  Manual steps still required:" -ForegroundColor White
Write-Host "  1. Complete HA setup wizard at http://localhost:8123" -ForegroundColor Gray
Write-Host "  2. Restart HA to load demo entities: docker restart homeassistant" -ForegroundColor Gray
Write-Host "  3. Generate HA token: Profile > Security > Long-lived access tokens" -ForegroundColor Gray
Write-Host "  4. Update HASS_TOKEN in .claude.json:" -ForegroundColor Gray
Write-Host "     code `$env:USERPROFILE\.claude.json" -ForegroundColor Cyan
Write-Host "  5. Add GitHub MCP (see step 10 output above)" -ForegroundColor Gray
Write-Host "  6. Add Context7 MCP (get free key at context7.com)" -ForegroundColor Gray
Write-Host "  7. Once ready to start Stage 1 -- re-enable ha-mcp:" -ForegroundColor Gray
Write-Host "     cd $ProjectPath && claude mcp list" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Paths:" -ForegroundColor White
Write-Host "  Project:  $ProjectPath" -ForegroundColor Cyan
Write-Host "  HA:       $HAConfigPath" -ForegroundColor Cyan
Write-Host "  HA URL:   http://localhost:8123" -ForegroundColor Cyan
Write-Host "  Config:   $env:USERPROFILE\.claude.json" -ForegroundColor Cyan
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
