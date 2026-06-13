# Platform Status

## Full stack on Pi -- COMPLETE 2026-06-13

### What is running (Pi 192.168.0.26)

| Service | How | Port | Status |
|---|---|---|---|
| Home Assistant | Docker Container (`network_mode: host`) | 8123 | running |
| ha-core | PM2 (`npm start`, fork mode) | 3001 | running, HA WebSocket connected |
| Tailscale | systemd service | -- | enrolled, IP 100.117.86.4 |
| Cloudflare Tunnel | systemd service (`cloudflared`) | -- | active, tunnel ha-pi |

### Access

| How | URL / address |
|---|---|
| Local LAN | `http://192.168.0.26:3001` |
| Tailscale | `http://100.117.86.4:3001` |
| Public (Cloudflare Tunnel) | `https://ha.smartboyz.com` |

### HA admin account
Username: `admin`  
URL: `http://192.168.0.26:8123`  
(Password set during provisioning -- change via HA Profile > Security if needed)

---

## Resolution log

### Bug 1: PM2 + ESM entry-point guard (2026-06-13)

**Symptom:** ha-core appeared `online` in PM2, zero restarts, but port 3001 never
bound and both log files were empty.

**Root cause:** PM2 fork mode uses an internal wrapper (`ProcessContainerFork.js`)
that replaces `process.argv[1]` with its own path. `src/index.js` uses the
standard ESM guard:

```js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(...)  // never reached under PM2
}
```

Under PM2, `process.argv[1]` is always `ProcessContainerFork.js`, so the guard
is always `false`. The process lives on PM2 IPC handles but calls nothing.

**Fix:** `ecosystem.config.cjs` uses `script: 'npm', args: 'start'`. PM2 forks
`npm`; npm spawns `node src/index.js` as a normal child where `argv[1]` is the
real script path and the guard passes.

### Bug 2: dotenv not loaded (2026-06-13)

**Symptom:** After writing `~/ha-core/.env` with `HASS_TOKEN`, ha-core still
logged "HA authentication failed". `NODE_OPTIONS=--env-file=...` is blocked by
Node.js security policy.

**Fix:** Added `import "dotenv/config"` as the first import in `src/index.js`.
dotenv is already a listed dependency (v17.4.2). The import runs before any
module that reads `process.env`, so `HASS_TOKEN` is available when ws-client
connects.

### Verified working (2026-06-13)

- `ss -tlnp` on Pi shows `node` listening on `:3001`
- `curl http://localhost:3001/` returns `HTTP/1.1 302 Found`
- PM2 logs show `ha-core listening on port 3001` and `HA WebSocket connected`
- No errors in `ha-core-error.log`
- `pm2 kill` + `pm2 resurrect` -- port binds again, HA reconnects, 0 restarts
- `pm2 save` done; dump has `script: /usr/bin/npm, args: start`
- PM2 systemd unit (`pm2-joshsaka.service`) registered and enabled
- Docker container `homeassistant` set to `restart: unless-stopped`

### Tailscale + Cloudflare Tunnel verified (2026-06-13)

- Tailscale enrolled with `--accept-dns=false` (avoids conflict with HA mDNS)
- Tailscale IP: `100.117.86.4`
- Cloudflare Tunnel `ha-pi` (UUID `8ffd2360-1ba1-4702-871f-14f0a450e1a3`) running as systemd service
- Token-based (remotely managed) -- no cert.pem required
- Public hostname `ha.smartboyz.com` → `http://localhost:3001`
- `curl https://ha.smartboyz.com/` → `HTTP/2 302 → /manage` (verified from Pi and Windows)
- SSE smoke test: `curl -N -H "Accept: text/event-stream" https://ha.smartboyz.com/events` -- stream opened, live `state_changed` events confirmed flowing
- PM2 logs show `GET / 302` and `GET /events 200` hits from tunnel

### What lives where on the Pi

```
~/ha-core/                 ha-core source (deployed via npm run deploy:pi)
~/ha-core/.env             secrets (HASS_TOKEN -- never committed to git)
~/ha-core/ecosystem.config.cjs  PM2 config
~/homeassistant/           HA data directory
~/homeassistant/config/    HA configuration (persisted across container restarts)
~/homeassistant/docker-compose.yml
~/client-app/              client PWA build (for ha-core's CLIENT_CONFIG_PATH)
```

### Client PWA on Cloudflare Pages (2026-06-13)

| What | Where |
|---|---|
| Pages project | `smarthome-app` |
| Production URL | `https://app.smartboyz.com` |
| Pages.dev URL | `https://smarthome-app.pages.dev` |
| Deploy command | `npm run deploy:pages` (build + strip demo/ + wrangler) |

- `VITE_API_BASE=https://ha.smartboyz.com` set in Pages env at build time
- CORS on Pi: `CLIENT_ORIGIN=https://app.smartboyz.com`
- ha-core API router mounted at `/api` (consistent in dev + prod)
- Verified: PWA 200, `/api/entities` 200 with CORS, SSE stream opens

### Next milestones

- Configure HA with actual devices (Zigbee, Shelly, etc.) at client site
- Playwright smoke test end-to-end through tunnel (toggle light, confirm SSE tile update)
- Set `VITE_API_BASE` as a Pages environment variable in the dashboard (so `npm run deploy:pages` doesn't need it set locally)
