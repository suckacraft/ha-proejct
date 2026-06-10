# Dev vs Client Device -- Key Differences

Quick reference for understanding what differs between your dev/POC Pi
and a production client device. This is the most common source of
confusion during early installs.

---

## Side by side comparison

| Aspect | Dev / POC Pi | Client Device (Pi or mini PC) |
|---|---|---|
| Purpose | Learning, building, testing | Production -- client's home |
| OS | Raspberry Pi OS Lite | Raspberry Pi OS Lite or Ubuntu Server |
| Docker networking | host mode | host mode (both Linux -- host mode works) |
| /etc/localtime volume | included | included |
| Demo integration | YES -- needed for test entities | NO -- remove before deployment |
| Auto-update | Your choice | DISABLED permanently |
| SOPS secrets | Not required | MANDATORY |
| Cloudflare Tunnel | Not required | MANDATORY |
| Backblaze B2 backup | Not required | MANDATORY |
| USB SSD boot | Recommended | MANDATORY |
| HA token stored | In .claude.json on laptop | In SOPS encrypted secrets on device |
| Tailscale | Your personal tailnet | Operator tailnet (tagged with site name) |
| Access from laptop | SSH + ha-mcp for Claude Code | SSH via Tailscale only |
| Deploy mode | 03-deploy-pi.ps1 -Mode Home | 03-deploy-pi.ps1 -Mode Client |
| ops-agent | Disabled, masked stub (scaffold only) | NEVER installed |
| Claude Code on device | Installed, reachable via Tailscale SSH | NEVER installed |
| CLAUDE_OPS_API_KEY | Commented placeholder in .env | NEVER present |

---

## The most important difference

On Windows (your dev laptop), Docker Desktop does NOT support
network_mode: host. Use explicit port mapping instead:

    ports:
      - "8123:8123"

On Linux (Pi or mini PC), Docker DOES support network_mode: host.
Use it -- it is simpler and performs better:

    network_mode: host

Never copy a Windows docker-compose.yml directly to a Linux device.
They are different configs for the same purpose.

---

## Common mistakes

### Deploying demo entities to a client site
The demo: line in configuration.yaml creates fake entities. If left in
a client config, the client sees demo lights and sensors in their app.
The provisioning checklist catches this, but double-check configuration.yaml
before every client deployment.

### Using Windows docker-compose.yml on Pi/mini PC
network_mode: host will work correctly on the Pi but the Windows version
uses ports: mapping instead. Keep separate compose files or use the
correct template from this folder for each context.

### Not disabling HA auto-update
HA updates monthly. An auto-update on a client site can break integrations
without warning. Always confirm auto-update is off before handover.

### Storing secrets in plain .env files on client devices
On your dev laptop, plain .env or direct .claude.json storage is fine.
On a client device in someone's home, SOPS encryption is mandatory.
A Shelly relay has its own network interface -- a compromised device on
the client network could read plain secrets files.

### Skipping USB SSD on client Pi deployments
SD cards have a meaningful failure rate under continuous read/write load.
HA writes to the database constantly. A failed SD card on a client site
at 11pm is an expensive support call. USB SSD boot is non-negotiable for
production Pi deployments.
