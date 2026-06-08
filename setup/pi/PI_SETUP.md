# Raspberry Pi 5 Setup Guide

This guide covers the Pi 5 in two contexts:

1. DEV/POC use -- your home lab Pi used for learning and building
2. CLIENT use -- a Pi deployed to a client site as the production hub

The setup is identical up to Step 8. From Step 8, the paths diverge.

---

## Hardware checklist before starting

- [ ] Raspberry Pi 5 8GB
- [ ] USB-C power supply (27W official Pi 5 PSU recommended)
- [ ] MicroSD card 32GB+ A2 rated (for initial boot only)
- [ ] USB SSD 256GB+ (production boot drive -- replaces SD after setup)
- [ ] Sonoff Zigbee 3.0 USB dongle
- [ ] Google Coral USB Accelerator (for Frigate -- buy from RS Components AU ~$99)
- [ ] MicroHDMI cable (optional -- only needed if SSH fails on first boot)
- [ ] Ethernet cable (strongly recommended over WiFi for first setup)

---

## Step 1 -- Flash the SD card (from your Windows laptop)

Download and install Raspberry Pi Imager:
winget install RaspberryPiFoundation.RaspberryPiImager

Open Raspberry Pi Imager:
- Device: Raspberry Pi 5
- OS: Raspberry Pi OS Lite (64-bit) -- no desktop, server only
- Storage: your SD card

Before writing, click the settings gear (or Ctrl+Shift+X) and configure:
- Hostname: piserver (or client site name for client devices e.g. thornbury)
- Username: pi
- Password: [strong password -- save it in your password manager]
- WiFi: your home network SSID and password (skip for client devices -- use ethernet)
- Enable SSH: yes, use password authentication
- Locale: Australia/Melbourne, keyboard layout: gb

Write the image. This takes 3-5 minutes.

---

## Step 2 -- First boot

Insert SD card into Pi. Connect ethernet cable to your router. Power on.
Wait 90 seconds for first boot to complete.

Find the Pi's IP address from your router's DHCP table, or try:

    ping piserver.local

SSH from your laptop:

    ssh pi@piserver.local

If that fails, try the IP address directly:

    ssh pi@192.168.1.X

Accept the SSH host key fingerprint when prompted.

---

## Step 3 -- Initial system update

    sudo apt update && sudo apt full-upgrade -y
    sudo reboot

Wait 60 seconds for reboot, then SSH back in.

---

## Step 4 -- Set a static IP (do this before anything else)

Either set a DHCP reservation in your router (recommended) or set a
static IP on the Pi itself. For router DHCP reservation, note the Pi's
MAC address:

    ip link show eth0

In your router admin, create a reservation: MAC -> fixed IP (e.g. 192.168.1.50)

From this point on, SSH to the fixed IP, not the hostname.

---

## Step 5 -- Install Tailscale

    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up

Follow the auth link printed in the terminal -- approve the device in
your Tailscale admin dashboard.

Test remote access by SSHing via the Tailscale IP:

    ssh pi@100.X.X.X

This is how you will manage this device forever -- local or remote.

---

## Step 6 -- Install Docker

    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker pi
    newgrp docker
    docker --version

Verify Docker works without sudo:

    docker ps

---

## Step 7 -- Move boot to USB SSD (production reliability)

SD cards fail. USB SSD is dramatically more reliable for production.

Connect the USB SSD. Find its device path:

    lsblk

It will appear as /dev/sda or similar.

Use Raspberry Pi Imager on your laptop to write the same OS image to the
USB SSD (same settings as Step 1). Then on the Pi:

Enable USB boot:

    sudo raspi-config
    Advanced Options > Boot Order > USB Boot

Reboot with the USB SSD connected. Verify it booted from USB:

    lsblk
    findmnt /

The root filesystem should be on /dev/sda not /dev/mmcblk0.

You can remove the SD card now. The Pi boots from USB SSD permanently.

---

## Step 8 -- Install Home Assistant (same for dev and client)

Create the HA directory structure:

    mkdir -p ~/homeassistant/config

Create docker-compose.yml:

    cat > ~/homeassistant/docker-compose.yml << 'EOF'
    services:
      homeassistant:
        container_name: homeassistant
        image: ghcr.io/home-assistant/home-assistant:stable
        volumes:
          - /home/pi/homeassistant/config:/config
          - /etc/localtime:/etc/localtime:ro
        restart: unless-stopped
        network_mode: host
        environment:
          - TZ=Australia/Melbourne
    EOF

NOTE: network_mode: host works correctly on Linux (Pi/mini PC). It does NOT
work on Docker Desktop for Windows. The Pi uses the Linux Docker engine
so host networking is correct and preferred here.

Start HA:

    cd ~/homeassistant
    docker compose up -d

Wait 90 seconds, then open HA from your laptop browser:

    http://192.168.1.50:8123

(Use the Pi's fixed IP from Step 4)

Complete the HA setup wizard. Create your admin account.

---

## Step 9 -- Add Demo integration (dev Pi only)

For your dev/POC Pi, add demo entities for testing:

    nano ~/homeassistant/config/configuration.yaml

Add at the bottom:

    demo:

Save (Ctrl+X, Y, Enter), then restart HA:

    docker restart homeassistant

Skip this step for client Pi devices.

---

## Step 10 -- Generate HA token

In HA web UI:
- Click your profile (bottom left)
- Scroll to Security > Long-lived access tokens
- Create token named "ha-core-dev" (dev) or "ha-core" (client)
- Copy immediately -- shown only once
- Save in your password manager

---

## Step 11 -- Configure Zigbee dongle

Insert the Sonoff Zigbee USB dongle. Find its device path:

    ls /dev/serial/by-id/

It will show something like:
usb-ITead_Sonoff_Zigbee_3.0_USB_Dongle_Plus_..._if00

Note the full path. You will need this for Zigbee2MQTT config.

---

## Step 12 -- Configure Coral TPU

Insert the Google Coral USB Accelerator. Verify it is detected:

    lsusb | grep Google

Install the Coral runtime:

    echo "deb https://packages.cloud.google.com/apt coral-edgetpu-stable main" | sudo tee /etc/apt/sources.list.d/coral-edgetpu.list
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
    sudo apt update
    sudo apt install libedgetpu1-std

Verify:

    lsusb | grep Global Unichip

---

## FROM HERE -- PATHS DIVERGE

### Dev/POC Pi (continue to DEV ONLY section below)
### Client Pi (see setup/client-device/CLIENT_DEVICE_SETUP.md)

---

## DEV ONLY -- Steps 13+ (home lab Pi)

### Step 13 -- Register ha-mcp for Claude Code

On your Windows laptop, update .claude.json with the Pi's fixed IP:

    "ha-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "hass-mcp"],
      "env": {
        "HASS_URL": "http://192.168.1.50:8123",
        "HASS_TOKEN": "YOUR_TOKEN_FROM_STEP_10"
      }
    }

Or via Tailscale IP for remote access:

    "HASS_URL": "http://100.X.X.X:8123"

### Step 14 -- Run Stage 0 from your laptop

With the Pi running HA and ha-mcp registered, you are ready to run
the Claude Code spike from your Windows laptop against a real Pi device.

Open Claude Code on your laptop:

    cd C:\Users\Josh\smarthome-platform
    claude

Paste the Stage 0 prompt from docs/HA_PROJECT_KICKOFF_PROMPT.md

---

## Useful Pi management commands

    # Check HA is running
    docker ps

    # View HA logs
    docker logs homeassistant -f

    # Restart HA
    docker restart homeassistant

    # Update HA to latest
    cd ~/homeassistant && docker compose pull && docker compose up -d

    # Check disk usage
    df -h

    # Check temperature (Pi 5 throttles at 85C)
    vcgencmd measure_temp

    # Check USB devices
    lsusb

    # Check Zigbee dongle
    ls /dev/serial/by-id/

    # Reboot Pi
    sudo reboot

    # Shutdown Pi safely (before power off)
    sudo shutdown -h now
