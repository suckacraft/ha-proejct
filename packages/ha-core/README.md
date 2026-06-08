# ha-core

Home Assistant WebSocket adapter and REST API service.

## Setup

1. Copy `config.json` and fill in your HA long-lived access token
2. `npm install`
3. `npm run dev`

## Configuration

- `config.json` — HA connection URL, token, site ID, port
- Environment secrets managed via SOPS (never commit .env)

## Maintenance

- Logs via Winston to stdout
- SQLite DB stored locally for event persistence
- WebSocket reconnects automatically on disconnect
