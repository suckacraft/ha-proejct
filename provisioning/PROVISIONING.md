# Provisioning Checklist -- New Client Site

Use this checklist for every new client installation.
Complete it in order. Do not skip steps.
Sign off each section before proceeding to the next.

---

## Pre-install (office, before site visit)

- [ ] Client agreement signed and on file
- [ ] Retainer tier agreed and invoiced
- [ ] Site survey completed (room count, device list, cable runs required)
- [ ] Hardware ordered and received
- [ ] Hardware tested on bench before delivery
- [ ] Mini PC imaged with base OS and Docker
- [ ] HA installed and confirmed booting on mini PC
- [ ] Provisioning script ready: provisioning/provision-site.js
- [ ] Client config prepared: provisioning/site-template/site.config.json
- [ ] Backblaze B2 buckets created for this site (config + camera clips)
- [ ] SOPS secrets file generated and encrypted
- [ ] Cloudflare Tunnel created and tested
- [ ] Client PWA URL confirmed and resolving

---

## On-site -- electrician tasks

- [ ] Comms cabinet installed or nominated
- [ ] Mini PC mounted and powered in cabinet
- [ ] PoE switch installed and powered
- [ ] Cat6 runs completed to all camera positions
- [ ] Cameras mounted and connected to PoE switch
- [ ] Shelly relays installed behind switch plates (one per circuit)
- [ ] All electrical work certified

---

## On-site -- platform tasks

- [ ] Mini PC connected to client network
- [ ] Platform stack deployed in CLIENT mode from the laptop:
      `setup\03-deploy-pi.ps1 -Mode Client -PiIp <site-ip>` completed cleanly
- [ ] `demo:` is NOT present in configuration.yaml (client mode asserts and
      strips it; confirm the deploy did not warn about it)
- [ ] No ops-agent unit, no Claude Code, no dev tooling on the device (client mode)
- [ ] Tailscale enrolled on mini PC (operator tailnet)
- [ ] HA accessible at http://[site-ip]:8123
- [ ] All Shelly relays discovered in HA
- [ ] Zigbee dongle inserted and Zigbee2MQTT running
- [ ] All Zigbee devices paired and named
- [ ] All sensors placed and confirmed reporting
- [ ] Cameras appearing in Frigate
- [ ] Person detection tested on each camera
- [ ] Coral TPU confirmed active in Frigate logs
- [ ] Sensibo paired with climate system
- [ ] All entities assigned to rooms in client.config.json
- [ ] All automations loaded and tested
- [ ] All scenes tested (Morning, Away, Evening, Movie, Sleep)
- [ ] Provisioning script run and completed cleanly
- [ ] Remote access confirmed from operator laptop via Tailscale
- [ ] Client PWA accessible from outside network via Cloudflare Tunnel
- [ ] First automated backup confirmed in Backblaze B2
- [ ] ha-core restarted after any config changes during commissioning -- a stale
  server causes silent SSE failures (tiles load but never update live)
- [ ] Playwright smoke test run from operator laptop after provisioning: navigate
  to the client app URL, toggle a light in HA, confirm the tile updates within
  2 seconds without a refresh
- [ ] Preferences API seeded with the client's home screen favourites
  (POST /api/preferences/home_favourites)

---

## Device Discovery Protocol

Run in order during every install. Takes 15-20 minutes.

**IP DEVICES (automatic):**
- [ ] NMAP Tracker configured with client subnet
- [ ] First scan complete -- all IP devices visible in HA
- [ ] Cross-reference with site survey

**ZIGBEE:**
- [ ] Zigbee2MQTT running and connected to dongle
- [ ] permit_join enabled 4 minutes, all devices paired
- [ ] permit_join disabled after pairing complete
- [ ] All devices showing correct model in Zigbee2MQTT

**Z-WAVE (if applicable):**
- [ ] Z-Wave JS integration enabled
- [ ] All devices paired, network map shows good signal

**BLUETOOTH:**
- [ ] HA Bluetooth integration enabled
- [ ] All Bluetooth sensors detected and showing readings

**433MHz (if applicable):**
- [ ] RTL-SDR dongle connected, rtl_433 running via MQTT
- [ ] Each device triggered once to register in HA

**MATTER/THREAD (if applicable):**
- [ ] Thread border router added to HA
- [ ] All Matter/Thread devices discovered automatically

**FINAL INVENTORY:**
- [ ] Screenshot of all discovered devices in HA
- [ ] Device count matches site survey
- [ ] All devices assigned to rooms in client.config.json

NOTE: This manual checklist will be replaced by the Stage 11 provisioning
script which automates all of the above. Until then this is the standard process.

---

## Handover

- [ ] Client app installed on all household phones (see CLIENT_HANDOVER.md)
- [ ] Client walkthrough completed (see CLIENT_HANDOVER.md)
- [ ] Push notifications tested on client's phone
- [ ] Client quick reference sheet left with client
- [ ] Client login credentials delivered securely
- [ ] CLIENT_PRIVACY.md reviewed with client
- [ ] MANAGED_SERVICE.md reviewed with client
- [ ] Site registered in operator-app sites.json
- [ ] Site added to operator dashboard and confirmed showing healthy

---

## Post-install (office, within 24 hours)

- [ ] Commissioning checklist filed
- [ ] Site config committed to git
- [ ] Client invoiced for installation
- [ ] Retainer payment set up
- [ ] 7-day follow-up call scheduled
- [ ] Any punch list items logged as issues
- [ ] All device types at this site have appropriate custom tiles (not just
  FallbackTile). Log any new device types as tile requests for the next
  development sprint.
- [ ] CLIENT_HANDOVER.md PWA installation completed on all household iOS devices
  -- push notifications confirmed.

---

## Sign-off

Installer: _______________  Date: _______________

Electrician: _______________  Date: _______________

Client acknowledged: _______________  Date: _______________

---

## Pi Deployment Known Gotchas

Lessons from the first live Pi deploy. Apply to every subsequent device.

### PM2 + ESM entry-point guard (critical)

ha-core uses `if (process.argv[1] === fileURLToPath(import.meta.url))` to avoid
running the server when the file is imported in tests. PM2 fork mode replaces
`process.argv[1]` with its own wrapper (`ProcessContainerFork.js`), so the guard
always fails -- the process appears `online` in PM2 but never binds a port and
emits no logs.

**Fix: always run ha-core via `npm start`, not by pointing PM2 at the script directly.**

Working ecosystem.config.cjs:
```js
module.exports = {
  apps: [{
    name: 'ha-core',
    script: 'npm',
    args: 'start',
    cwd: '/home/joshsaka/ha-core',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    env: { NODE_ENV: 'production' }
  }]
}
```

Symptoms of the broken config: PM2 shows `online`, `ss -tlnp | grep 3001` returns
nothing, both PM2 log files are empty.

### Pin Node >=22 in package.json

`better-sqlite3` and the global `WebSocket` object require Node 22+. ha-core
`package.json` now has `"engines": { "node": ">=22" }`. Verify on each new Pi:

```bash
node --version   # must be v22.x or higher
```

If not, install via nvm: `nvm install 22 && nvm use 22 && nvm alias default 22`

### pm2 kill after Node upgrades

After upgrading Node on the Pi (e.g. via nvm), PM2 must be killed and restarted.
The running PM2 daemon caches the old Node binary path. If the daemon is left
running after a Node upgrade, `pm2 resurrect` will try to use the old binary.

```bash
pm2 kill
pm2 resurrect   # re-links to the new node
pm2 save
```

### build-essential required for native modules

`better-sqlite3` compiles a native addon against the running Node version.
`build-essential` (gcc, make, python3) must be installed before `npm install`:

```bash
sudo apt install -y build-essential python3
```

If you see `node-pre-gyp` or `make` errors during `npm install --omit=dev`, this
is missing.

### Use scp, not rsync -- exclude node_modules

rsync is not installed on Pi OS Lite. Use scp for file transfer. Never copy
`node_modules` to the Pi -- it will fail with `ENOTEMPTY` and corrupts the
install. Always run `npm install --omit=dev` on the Pi after copying source:

```bash
# From the deploy machine (Windows):
scp -r packages/ha-core/src packages/ha-core/package*.json joshsaka@192.168.0.26:~/ha-core/
ssh joshsaka@192.168.0.26 "cd ~/ha-core && npm install --omit=dev"
# Or use the deploy script:
npm run deploy:pi
```

### CRLF line endings break bash scripts

Windows git checkouts produce CRLF line endings in .sh files. bash interprets
the trailing `\r` as part of the command and fails with `$'\r': command not found`.

`.gitattributes` in the repo root enforces `*.sh text eol=lf`. Ensure this file
is committed before any .sh files are added, or re-normalise with:

```bash
git add --renormalize .
git commit -m "fix: normalise line endings"
```

Test on the Pi: `file scripts/pi-setup.sh` should say "ASCII text" not
"ASCII text, with CRLF line terminators".

### client.config.json cross-package dependency

ha-core reads `client.config.json` via `CLIENT_CONFIG_PATH` (defaulting to a
path relative to its cwd that reaches into `../client-app/`). On the Pi, the
default assumes `~/ha-core/` and `~/client-app/` are siblings. If the directory
layout differs, set `CLIENT_CONFIG_PATH` explicitly in `~/ha-core/.env`.

Confirm the file exists before starting ha-core:
```bash
ls ~/client-app/client.config.json
```

If missing, copy from the repo: `scp packages/client-app/client.config.json joshsaka@192.168.0.26:~/client-app/`
