# Client Device Setup Guide

This guide covers preparing a production device for a client site.
Two supported hardware configurations:

- Raspberry Pi 5 8GB (lighter installs, no Frigate or 1-2 cameras max)
- Beelink EQ12 mini PC (standard, recommended for all full installs)

Both follow the same process from Step 6 onward.

---

## Hardware decision guide

Use Pi 5 when:
- Zigbee sensors and Shelly relays only (no cameras or 1-2 cameras max)
- Budget-sensitive client needing a lower price point
- You are comfortable with the SD card reliability risk (use USB SSD)
- The install does not require Frigate with 4+ cameras

Use mini PC (Beelink EQ12 or similar) when:
- 3+ cameras with Frigate AI detection
- Full install (cameras + lighting + climate + audio)
- Client on a Standard or Premium retainer (higher support expectations)
- Long-term reliability is the priority

---

## SECTION A -- Raspberry Pi client device

Follow PI_SETUP.md Steps 1 through 12, with these differences:

- Hostname: use the client site name (e.g. thornbury, brighton, coburg)
- Skip Step 9 (demo integration -- not for client devices)
- Use ethernet, not WiFi, for the permanent connection where possible
- USB SSD boot (Step 7) is mandatory for client Pi devices -- not optional

Then continue with SECTION C (Hardening and Production Config) below.

---

## SECTION B -- Mini PC client device (Beelink EQ12 or similar)

### Step 1 -- Prepare the mini PC

The EQ12 ships with Windows 11. You will replace it with Ubuntu Server.

Download Ubuntu Server 24.04 LTS ISO from ubuntu.com/download/server
Create a bootable USB using Rufus (winget install Rufus.Rufus) on your laptop.

Boot the mini PC from the USB (press F7 or Del at startup for boot menu).
Install Ubuntu Server with these settings:
- Hostname: client site name (e.g. thornbury)
- Username: smarthome
- Password: strong password -- save in password manager
- Enable OpenSSH server: yes
- No additional snaps

After install, SSH from your laptop:

    ssh smarthome@192.168.1.X

### Step 2 -- System update

    sudo apt update && sudo apt full-upgrade -y
    sudo reboot

### Step 3 -- Set static IP

    sudo nano /etc/netplan/00-installer-config.yaml

Configure static IP (adjust interface name and IP for the site network):

    network:
      version: 2
      ethernets:
        enp1s0:
          addresses:
            - 192.168.1.50/24
          routes:
            - to: default
              via: 192.168.1.1
          nameservers:
            addresses: [8.8.8.8, 8.8.4.4]

    sudo netplan apply

### Step 4 -- Install Tailscale

    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up

Approve in Tailscale dashboard. Tag the device with the client site name.

### Step 5 -- Install Docker

    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker smarthome
    newgrp docker
    docker --version

### Step 6 -- Configure Zigbee dongle (same as Pi Step 11)

    ls /dev/serial/by-id/

Note the full device path for Zigbee2MQTT config.

### Step 7 -- Configure Coral TPU (same as Pi Step 12)

    lsusb | grep Google

Install runtime as per PI_SETUP.md Step 12.

Then continue with SECTION C below.

---

## SECTION C -- Hardening and Production Config (all devices)

This section is the same for both Pi and mini PC.
Complete these steps for every client device before deployment.

### C1 -- Install SOPS for encrypted secrets

    sudo apt install age -y
    wget https://github.com/getsops/sops/releases/latest/download/sops-v3.x.x.linux.amd64
    sudo mv sops-v3.x.x.linux.amd64 /usr/local/bin/sops
    sudo chmod +x /usr/local/bin/sops

Generate an age key for this site (keep the private key secure -- off device):

    age-keygen -o ~/site-key.txt
    cat ~/site-key.txt

Copy the private key to your password manager. The public key goes in the
SOPS config. The private key never stays on the device.

### C2 -- Create encrypted secrets file

On your laptop, create the secrets file for this site:

    cat > secrets.env << 'EOF'
    HA_TOKEN=PLACEHOLDER
    BACKBLAZE_KEY_ID=PLACEHOLDER
    BACKBLAZE_APP_KEY=PLACEHOLDER
    CLOUDFLARE_TUNNEL_TOKEN=PLACEHOLDER
    HA_CORE_JWT_SECRET=PLACEHOLDER
    EOF

Encrypt with the site's age public key:

    sops --age AGE_PUBLIC_KEY_HERE --encrypt secrets.env > secrets.enc.env

Copy the encrypted file to the device:

    scp secrets.enc.env smarthome@192.168.1.50:~/

Never copy the unencrypted secrets.env to the device.

### C3 -- Install Home Assistant (production config)

    mkdir -p ~/homeassistant/config

For Pi:

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

For mini PC (smarthome user):

    cat > ~/homeassistant/docker-compose.yml << 'EOF'
    services:
      homeassistant:
        container_name: homeassistant
        image: ghcr.io/home-assistant/home-assistant:stable
        volumes:
          - /home/smarthome/homeassistant/config:/config
          - /etc/localtime:/etc/localtime:ro
        restart: unless-stopped
        network_mode: host
        environment:
          - TZ=Australia/Melbourne
    EOF

NOTE: network_mode: host is correct and preferred on Linux.
Never use network_mode: host on Docker Desktop for Windows.

Start HA:

    cd ~/homeassistant && docker compose up -d

Wait 90 seconds. Open from your laptop:

    http://192.168.1.50:8123

Complete setup wizard. Create admin account. Generate long-lived token.
Add token to secrets.enc.env (re-encrypt after updating).

### C4 -- Disable HA auto-update

In HA: Settings > System > Updates
Set "Automatically check for updates" to Off.
Updates are managed via operator dashboard on a staged rollout schedule.

### C5 -- Set up Cloudflare Tunnel

Install cloudflared:

    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared.deb

Authenticate:

    cloudflared tunnel login

Create tunnel for this site (use client site name):

    cloudflared tunnel create thornbury

Configure the tunnel:

    mkdir -p ~/.cloudflared
    cat > ~/.cloudflared/config.yml << 'EOF'
    tunnel: TUNNEL_ID_HERE
    credentials-file: /home/smarthome/.cloudflared/TUNNEL_ID_HERE.json
    ingress:
      - hostname: thornbury.yourdomain.com.au
        service: http://localhost:3000
      - service: http_status:404
    EOF

Start as a service:

    sudo cloudflared service install
    sudo systemctl enable cloudflared
    sudo systemctl start cloudflared

Add the DNS record in Cloudflare dashboard:
CNAME thornbury.yourdomain.com.au -> TUNNEL_ID_HERE.cfargotunnel.com

Test from your phone (not on the local network):

    https://thornbury.yourdomain.com.au

### C6 -- Configure Backblaze B2 backup

Install rclone:

    curl https://rclone.org/install.sh | sudo bash

Configure with the site's B2 credentials (from SOPS secrets):

    rclone config
    # Choose n for new remote
    # Name: b2-sitename
    # Type: b2
    # Account ID: BACKBLAZE_KEY_ID
    # Application key: BACKBLAZE_APP_KEY

Create nightly backup cron job:

    crontab -e

Add:

    0 2 * * * /usr/local/bin/rclone sync ~/homeassistant/config b2-sitename:smarthome-SITENAME-config --log-file=/var/log/ha-backup.log

### C7 -- Verify full stack

Run this checklist before leaving the site:

- [ ] HA accessible at http://192.168.1.50:8123
- [ ] HA accessible remotely at https://thornbury.yourdomain.com.au
- [ ] Tailscale connected and accessible via Tailscale IP
- [ ] Zigbee devices appearing in HA
- [ ] Cameras appearing in Frigate (if applicable)
- [ ] Coral TPU active in Frigate logs (if applicable)
- [ ] Test backup: rclone sync ~/homeassistant/config b2-sitename:smarthome-SITENAME-config
- [ ] B2 bucket shows files after manual backup test
- [ ] HA auto-update confirmed disabled
- [ ] Device appears in operator-app sites dashboard

---

## SECTION D -- Migration (Pi to mini PC)

Use this when a client outgrows a Pi install and needs to move to a mini PC.

### D1 -- Before migration (office prep)

- Prepare new mini PC through Section B and C above (do not run HA yet)
- Confirm B2 backup is current: check operator dashboard backup timestamp
- Schedule migration during a low-activity window (evening)

### D2 -- On site

Force a backup immediately before migration:

    On Pi: rclone sync ~/homeassistant/config b2-sitename:smarthome-SITENAME-config

Stop HA on the Pi:

    docker compose down

On the mini PC, restore from backup:

    rclone sync b2-sitename:smarthome-SITENAME-config ~/homeassistant/config

Start HA on mini PC:

    cd ~/homeassistant && docker compose up -d

Verify HA comes up with all devices and automations intact.

Update operator-app sites.json with new Tailscale hostname and hardware info.

Remove Pi from Tailscale network:

    In Tailscale dashboard: remove the old device

### D3 -- Post migration

- Confirm all automations firing correctly
- Confirm cameras working in Frigate (if added as part of upgrade)
- Run full provisioning checklist (provisioning/PROVISIONING.md)
- Update site.config.json with new hardware details
- Retain Pi -- it is now a spare unit or dev device

---

## Hardware inventory reference

After setting up a client device, update provisioning/site-template/site.config.json
with the hardware details. This is the record of what is deployed where.

Keep a physical inventory spreadsheet tracking:
- Site name
- Hardware model and serial number
- Tailscale hostname
- Cloudflare tunnel name
- B2 bucket names
- Installation date
- Last backup confirmed
