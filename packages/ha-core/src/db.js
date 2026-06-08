import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH =
  process.env.DB_PATH ?? join(__dirname, "..", "data", "ha-core.db");

export const PRUNE_DAYS = parseInt(
  process.env.HISTORY_RETENTION_DAYS ?? "90",
  10,
);

// Tracks last-recorded state per entity to throttle device_history writes.
// Availability transitions always bypass the throttle.
const lastRecorded = new Map(); // entityId -> { state, timestamp }
const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes between non-availability writes

function openDb(path = DB_PATH) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS site_events (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT    NOT NULL,
      event_type TEXT   NOT NULL,
      detail    TEXT
    );

    CREATE TABLE IF NOT EXISTS device_history (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id            TEXT    NOT NULL,
      state                TEXT    NOT NULL,
      timestamp            TEXT    NOT NULL,
      is_availability_change INTEGER NOT NULL DEFAULT 0
    );

    -- Per-site key/value store for homeowner preferences (favourites,
    -- room defaults, etc.). value holds a JSON-serialised payload of any
    -- shape. Composite PK gives both isolation and the lookup index.
    CREATE TABLE IF NOT EXISTS preferences (
      site_id    TEXT NOT NULL,
      key        TEXT NOT NULL,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (site_id, key)
    );

    CREATE INDEX IF NOT EXISTS idx_site_events_ts
      ON site_events(timestamp);

    CREATE INDEX IF NOT EXISTS idx_device_history_entity
      ON device_history(entity_id, timestamp);
  `);

  return db;
}

let _db = null;

export function getDb() {
  if (!_db) _db = openDb();
  return _db;
}

// Allow tests to inject a separate in-memory DB.
export function setDb(db) {
  _db = db;
}

// -- site_events --------------------------------------------------------------

export function recordSiteEvent(eventType, detail = null) {
  const db = getDb();
  db.prepare(
    "INSERT INTO site_events (timestamp, event_type, detail) VALUES (?, ?, ?)",
  ).run(
    new Date().toISOString(),
    eventType,
    detail ? JSON.stringify(detail) : null,
  );
}

export function getSiteEvents({ since = null, limit = 500 } = {}) {
  const db = getDb();
  if (since) {
    return db
      .prepare(
        "SELECT * FROM site_events WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT ?",
      )
      .all(since, limit);
  }
  return db
    .prepare("SELECT * FROM site_events ORDER BY timestamp DESC LIMIT ?")
    .all(limit);
}

export function getBackupHistory() {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM site_events
       WHERE event_type IN ('backup_completed', 'backup_failed', 'backup_started')
       ORDER BY timestamp DESC LIMIT 100`,
    )
    .all();
}

// Returns a summary: total connection events, estimated uptime percentage over
// the last 30 days, and the most recent connected/disconnected timestamps.
export function getUptimeSummary() {
  const db = getDb();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const events = db
    .prepare(
      `SELECT event_type, timestamp FROM site_events
       WHERE event_type IN ('ha_connected', 'ha_disconnected')
         AND timestamp >= ?
       ORDER BY timestamp ASC`,
    )
    .all(since);

  let uptimeMs = 0;
  let lastConnected = null;
  for (const ev of events) {
    if (ev.event_type === "ha_connected") {
      lastConnected = new Date(ev.timestamp).getTime();
    } else if (ev.event_type === "ha_disconnected" && lastConnected !== null) {
      uptimeMs += new Date(ev.timestamp).getTime() - lastConnected;
      lastConnected = null;
    }
  }
  // Still connected now
  if (lastConnected !== null) {
    uptimeMs += Date.now() - lastConnected;
  }

  const windowMs = 30 * 24 * 60 * 60 * 1000;
  const uptimePct =
    events.length === 0
      ? null
      : Math.round((uptimeMs / windowMs) * 100 * 10) / 10;

  const last = {
    connected:
      events.findLast((e) => e.event_type === "ha_connected")?.timestamp ??
      null,
    disconnected:
      events.findLast((e) => e.event_type === "ha_disconnected")?.timestamp ??
      null,
  };

  return {
    uptimePct30d: uptimePct,
    lastConnected: last.connected,
    lastDisconnected: last.disconnected,
  };
}

// -- device_history -----------------------------------------------------------

export function recordDeviceHistory(entityId, newState, oldState = null) {
  const isAvailabilityChange =
    newState === "unavailable" ||
    (oldState === "unavailable" && newState !== "unavailable");

  if (!isAvailabilityChange) {
    const prev = lastRecorded.get(entityId);
    if (prev) {
      const elapsed = Date.now() - prev.timestamp;
      if (elapsed < THROTTLE_MS && prev.state === newState) return; // no change, throttle
      if (elapsed < THROTTLE_MS) return; // changed but within window, throttle
    }
  }

  const db = getDb();
  db.prepare(
    `INSERT INTO device_history (entity_id, state, timestamp, is_availability_change)
     VALUES (?, ?, ?, ?)`,
  ).run(
    entityId,
    newState,
    new Date().toISOString(),
    isAvailabilityChange ? 1 : 0,
  );

  lastRecorded.set(entityId, { state: newState, timestamp: Date.now() });
}

export function getDeviceHistory(entityId, { since = null, limit = 200 } = {}) {
  const db = getDb();
  if (since) {
    return db
      .prepare(
        `SELECT * FROM device_history
         WHERE entity_id = ? AND timestamp >= ?
         ORDER BY timestamp DESC LIMIT ?`,
      )
      .all(entityId, since, limit);
  }
  return db
    .prepare(
      "SELECT * FROM device_history WHERE entity_id = ? ORDER BY timestamp DESC LIMIT ?",
    )
    .all(entityId, limit);
}

// -- preferences --------------------------------------------------------------

// Reads a single preference. Returns the deserialised value, or null when the
// key has never been set for this site. Note: a key explicitly set to JSON
// null is indistinguishable from "unset" -- both yield null, which is the
// correct behaviour for a settings store.
export function getPreference(siteId, key) {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM preferences WHERE site_id = ? AND key = ?")
    .get(siteId, key);
  return row ? JSON.parse(row.value) : null;
}

// Returns every preference for a site as a plain { key: value } map.
export function getAllPreferences(siteId) {
  const db = getDb();
  const rows = db
    .prepare("SELECT key, value FROM preferences WHERE site_id = ?")
    .all(siteId);
  return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
}

// Upserts a preference. value may be any JSON-serialisable payload (object,
// array, string, number, boolean, or null). Returns the saved record.
export function setPreference(siteId, key, value) {
  const db = getDb();
  const updatedAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO preferences (site_id, key, value, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(site_id, key) DO UPDATE SET
       value      = excluded.value,
       updated_at = excluded.updated_at`,
  ).run(siteId, key, JSON.stringify(value), updatedAt);
  return { key, value, updatedAt };
}

// -- pruning ------------------------------------------------------------------

export function pruneOldRecords(days = PRUNE_DAYS) {
  const db = getDb();
  const cutoff = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { changes: eventsDeleted } = db
    .prepare("DELETE FROM site_events WHERE timestamp < ?")
    .run(cutoff);
  const { changes: historyDeleted } = db
    .prepare("DELETE FROM device_history WHERE timestamp < ?")
    .run(cutoff);
  return { eventsDeleted, historyDeleted };
}
