import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import {
  setDb,
  recordSiteEvent,
  getSiteEvents,
  getBackupHistory,
  getUptimeSummary,
  recordDeviceHistory,
  getDeviceHistory,
  pruneOldRecords,
  getPreference,
  getAllPreferences,
  setPreference,
} from "../src/db.js";

// Each test gets a fresh in-memory DB so tests are fully isolated.
function makeTestDb() {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE site_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      event_type TEXT NOT NULL,
      detail TEXT
    );
    CREATE TABLE device_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id TEXT NOT NULL,
      state TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      is_availability_change INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE preferences (
      site_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (site_id, key)
    );
    CREATE INDEX idx_site_events_ts ON site_events(timestamp);
    CREATE INDEX idx_device_history_entity ON device_history(entity_id, timestamp);
  `);
  return db;
}

beforeEach(() => {
  setDb(makeTestDb());
});

// -- site_events --------------------------------------------------------------

describe("recordSiteEvent / getSiteEvents", () => {
  it("records an event and retrieves it", () => {
    recordSiteEvent("ha_connected");
    const events = getSiteEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe("ha_connected");
    expect(events[0].timestamp).toBeTruthy();
    expect(events[0].detail).toBeNull();
  });

  it("stores detail as serialised JSON", () => {
    recordSiteEvent("backup_completed", { filesUploaded: ["a.db"] });
    const ev = getSiteEvents()[0];
    expect(JSON.parse(ev.detail)).toEqual({ filesUploaded: ["a.db"] });
  });

  it("filters by since timestamp", () => {
    recordSiteEvent("ha_connected");
    const future = new Date(Date.now() + 5000).toISOString();
    recordSiteEvent("ha_disconnected");
    // Only events after `future` -- which is between the two inserts' timestamps
    // Use a past cutoff to get both, then verify count
    const all = getSiteEvents({ since: new Date(0).toISOString() });
    expect(all.length).toBe(2);
    const none = getSiteEvents({ since: future });
    expect(none.length).toBe(0);
  });

  it("respects the limit parameter", () => {
    for (let i = 0; i < 10; i++) recordSiteEvent("ha_connected");
    expect(getSiteEvents({ limit: 3 })).toHaveLength(3);
  });
});

describe("getBackupHistory", () => {
  it("returns only backup event types", () => {
    recordSiteEvent("ha_connected");
    recordSiteEvent("backup_started");
    recordSiteEvent("backup_completed", { ok: true });
    recordSiteEvent("ha_disconnected");
    const backups = getBackupHistory();
    expect(backups).toHaveLength(2);
    expect(backups.every((e) => e.event_type.startsWith("backup_"))).toBe(true);
  });
});

describe("getUptimeSummary", () => {
  it("returns null uptimePct when no connection events exist", () => {
    const summary = getUptimeSummary();
    expect(summary.uptimePct30d).toBeNull();
    expect(summary.lastConnected).toBeNull();
    expect(summary.lastDisconnected).toBeNull();
  });

  it("calculates uptime percentage from connect/disconnect pairs", () => {
    // Simulate: connected 2 hours ago, disconnected 1 hour ago (1h downtime in 30d window)
    const now = Date.now();
    const db = makeTestDb();
    setDb(db);
    db.prepare(
      "INSERT INTO site_events (timestamp, event_type) VALUES (?, ?)",
    ).run(new Date(now - 2 * 3600_000).toISOString(), "ha_connected");
    db.prepare(
      "INSERT INTO site_events (timestamp, event_type) VALUES (?, ?)",
    ).run(new Date(now - 1 * 3600_000).toISOString(), "ha_disconnected");

    const summary = getUptimeSummary();
    // 1 hour uptime out of 30 days -- very low but non-zero
    expect(summary.uptimePct30d).toBeGreaterThan(0);
    expect(summary.lastConnected).toBeTruthy();
    expect(summary.lastDisconnected).toBeTruthy();
  });

  it("counts still-connected time (no disconnect event)", () => {
    const now = Date.now();
    const db = makeTestDb();
    setDb(db);
    db.prepare(
      "INSERT INTO site_events (timestamp, event_type) VALUES (?, ?)",
    ).run(new Date(now - 3600_000).toISOString(), "ha_connected");

    const summary = getUptimeSummary();
    expect(summary.uptimePct30d).toBeGreaterThan(0);
    expect(summary.lastDisconnected).toBeNull();
  });
});

// -- device_history -----------------------------------------------------------

describe("recordDeviceHistory / getDeviceHistory", () => {
  it("records a state change and retrieves it", () => {
    recordDeviceHistory("light.bed_light", "on", "off");
    const rows = getDeviceHistory("light.bed_light");
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe("on");
    expect(rows[0].entity_id).toBe("light.bed_light");
  });

  it("marks availability transitions correctly", () => {
    recordDeviceHistory("sensor.temp", "unavailable", "22.5");
    const rows = getDeviceHistory("sensor.temp");
    expect(rows[0].is_availability_change).toBe(1);
  });

  it("marks recovery from unavailable as an availability change", () => {
    recordDeviceHistory("sensor.temp", "22.5", "unavailable");
    const rows = getDeviceHistory("sensor.temp");
    expect(rows[0].is_availability_change).toBe(1);
  });

  it("does not mark normal state changes as availability transitions", () => {
    recordDeviceHistory("light.kitchen", "on", "off");
    const rows = getDeviceHistory("light.kitchen");
    expect(rows[0].is_availability_change).toBe(0);
  });

  it("throttles duplicate non-availability writes within the window", () => {
    // Same state twice rapidly -- only one should be written
    recordDeviceHistory("switch.ac", "off", "on");
    recordDeviceHistory("switch.ac", "off", "off"); // same state, within throttle window
    const rows = getDeviceHistory("switch.ac");
    expect(rows).toHaveLength(1);
  });

  it("always writes availability transitions regardless of throttle", () => {
    recordDeviceHistory("lock.door", "locked", "unlocked");
    recordDeviceHistory("lock.door", "unavailable", "locked"); // availability -- bypass throttle
    const rows = getDeviceHistory("lock.door");
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.some((r) => r.is_availability_change === 1)).toBe(true);
  });

  it("returns empty array for an unknown entity", () => {
    expect(getDeviceHistory("light.unknown")).toEqual([]);
  });

  it("filters by since timestamp", () => {
    const past = new Date(Date.now() - 10_000).toISOString();
    recordDeviceHistory("sensor.x", "on", "off");
    const future = new Date(Date.now() + 10_000).toISOString();
    const rows = getDeviceHistory("sensor.x", { since: future });
    expect(rows).toHaveLength(0);
    const all = getDeviceHistory("sensor.x", { since: past });
    expect(all).toHaveLength(1);
  });
});

// -- preferences --------------------------------------------------------------

describe("setPreference / getPreference", () => {
  it("stores a value and reads it back", () => {
    setPreference("site-a", "theme", "dark");
    expect(getPreference("site-a", "theme")).toBe("dark");
  });

  it("returns null for a key that was never set", () => {
    expect(getPreference("site-a", "missing")).toBeNull();
  });

  it("round-trips objects and arrays without loss", () => {
    const favourites = [
      { name: "Sunset", type: "hs", value: [24, 90] },
      { name: "Reading", type: "color_temp", value: 3000 },
    ];
    setPreference("site-a", "favourites", favourites);
    expect(getPreference("site-a", "favourites")).toEqual(favourites);
  });

  it("round-trips primitive value types", () => {
    setPreference("site-a", "count", 42);
    setPreference("site-a", "enabled", true);
    setPreference("site-a", "nothing", null);
    expect(getPreference("site-a", "count")).toBe(42);
    expect(getPreference("site-a", "enabled")).toBe(true);
    expect(getPreference("site-a", "nothing")).toBeNull();
  });

  it("upserts: a second set overwrites the first", () => {
    setPreference("site-a", "theme", "dark");
    setPreference("site-a", "theme", "light");
    expect(getPreference("site-a", "theme")).toBe("light");
  });

  it("returns the saved record with an ISO updatedAt", () => {
    const saved = setPreference("site-a", "theme", "dark");
    expect(saved.key).toBe("theme");
    expect(saved.value).toBe("dark");
    expect(new Date(saved.updatedAt).toISOString()).toBe(saved.updatedAt);
  });

  it("isolates preferences by site -- same key, different sites", () => {
    setPreference("site-a", "theme", "dark");
    setPreference("site-b", "theme", "light");
    expect(getPreference("site-a", "theme")).toBe("dark");
    expect(getPreference("site-b", "theme")).toBe("light");
  });
});

describe("getAllPreferences", () => {
  it("returns an empty object when a site has no preferences", () => {
    expect(getAllPreferences("site-a")).toEqual({});
  });

  it("returns a key/value map scoped to one site", () => {
    setPreference("site-a", "theme", "dark");
    setPreference("site-a", "favourites", [1, 2]);
    setPreference("site-b", "theme", "light");
    expect(getAllPreferences("site-a")).toEqual({
      theme: "dark",
      favourites: [1, 2],
    });
  });
});

// -- pruning ------------------------------------------------------------------

describe("pruneOldRecords", () => {
  it("deletes records older than the cutoff and returns counts", () => {
    const db = makeTestDb();
    setDb(db);

    const oldTs = new Date(Date.now() - 100 * 24 * 3600_000).toISOString();
    const newTs = new Date().toISOString();

    db.prepare(
      "INSERT INTO site_events (timestamp, event_type) VALUES (?, ?)",
    ).run(oldTs, "ha_connected");
    db.prepare(
      "INSERT INTO site_events (timestamp, event_type) VALUES (?, ?)",
    ).run(newTs, "ha_connected");
    db.prepare(
      "INSERT INTO device_history (entity_id, state, timestamp, is_availability_change) VALUES (?, ?, ?, ?)",
    ).run("light.x", "on", oldTs, 0);

    const { eventsDeleted, historyDeleted } = pruneOldRecords(90);
    expect(eventsDeleted).toBe(1);
    expect(historyDeleted).toBe(1);
    expect(getSiteEvents()).toHaveLength(1);
  });

  it("does not delete recent records", () => {
    recordSiteEvent("ha_connected");
    const { eventsDeleted } = pruneOldRecords(90);
    expect(eventsDeleted).toBe(0);
  });
});
