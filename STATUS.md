# Platform Status

## ha-core on Pi -- RESOLVED 2026-06-13

### What was broken
ha-core ran perfectly in the foreground (`node src/index.js`) but would not bind
port 3001 when started by PM2. PM2 showed the process as `online`, 0 restarts,
and no log output -- the app was alive but never reached `app.listen()`.

### Root cause
PM2 fork mode uses an internal wrapper (`ProcessContainerFork.js`) that replaces
`process.argv[1]` with its own path. `src/index.js` contains an ESM entry-point
guard:

```js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // app.listen() lives here
}
```

Under PM2 fork mode, `process.argv[1]` is always
`/usr/lib/node_modules/pm2/lib/ProcessContainerFork.js`, not the actual script
path. The guard evaluates to `false`, so `app.listen()` is never called. The
process stays alive on PM2's IPC handles but binds no ports and emits no logs.

This affects any PM2 + Node ESM project that uses the `process.argv[1] ===
fileURLToPath(import.meta.url)` entry-point guard pattern.

### Fix
Run ha-core via `npm start` instead of having PM2 invoke the ESM script directly.
When PM2 launches `npm`, npm spawns `node src/index.js` as a normal child process.
In that child, `process.argv[1]` is the real script path, the guard passes, and
`app.listen()` is called.

**ecosystem.config.cjs (the working config):**

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

### Verified working (2026-06-13)
- `ss -tlnp` on Pi shows `node` listening on `:3001`
- `curl -i http://localhost:3001/` returns `HTTP/1.1 302 Found`
- `pm2 kill` + `pm2 resurrect` -- port 3001 binds again, 0 restarts
- `pm2 save` done; dump has `script: /usr/bin/npm, args: start`
- PM2 systemd unit (`pm2-joshsaka.service`) registered and enabled

### Remaining milestone
Install Home Assistant on the Pi, generate a long-lived access token, and
create `~/ha-core/.env` with `HASS_TOKEN`. See `packages/ha-core/.env.example`
for all required and optional variables. The HA WebSocket error in current logs
is expected until this step is complete -- ha-core binds 3001 regardless.
