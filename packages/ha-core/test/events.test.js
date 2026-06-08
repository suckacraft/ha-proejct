import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import EventEmitter from "node:events";

// Mock DB to avoid SQLite side effects -- we only care about SSE broadcast behaviour.
vi.mock("../src/db.js", () => ({
  recordDeviceHistory: vi.fn(),
  recordSiteEvent: vi.fn(),
  pruneOldRecords: vi.fn(),
  setDb: vi.fn(),
  getDb: vi.fn(),
  getSiteEvents: vi.fn(),
  getUptimeSummary: vi.fn(),
  getDeviceHistory: vi.fn(),
  getBackupHistory: vi.fn(),
  PRUNE_DAYS: 90,
}));

// Mock backup to prevent any B2/HA side effects.
vi.mock("../src/backup.js", () => ({ runBackup: vi.fn() }));

import sseManager from "../src/events.js";
import { wireEvents } from "../src/index.js";

function makeFakeWsClient() {
  const emitter = new EventEmitter();
  emitter.connected = false;
  return emitter;
}

describe("wireEvents SSE normalisation", () => {
  let fakeClient;
  let broadcastSpy;

  beforeEach(() => {
    fakeClient = makeFakeWsClient();
    broadcastSpy = vi
      .spyOn(sseManager, "broadcast")
      .mockImplementation(() => {});
    wireEvents(fakeClient, sseManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("broadcasts normalised entity envelope when new_state is present", () => {
    fakeClient.emit("state_changed", {
      entity_id: "light.ceiling_lights",
      new_state: {
        entity_id: "light.ceiling_lights",
        state: "on",
        attributes: {
          brightness: 128,
          friendly_name: "Ceiling Lights",
          color_mode: "brightness",
          supported_color_modes: ["brightness"],
        },
        last_changed: "2026-06-08T12:00:00+00:00",
      },
      old_state: null,
    });

    expect(broadcastSpy).toHaveBeenCalledOnce();
    const [eventName, payload] = broadcastSpy.mock.calls[0];
    expect(eventName).toBe("state_changed");
    // Normalised envelope shape
    expect(payload.id).toBe("light.ceiling_lights");
    expect(payload.domain).toBe("light");
    expect(payload.name).toBe("Ceiling Lights");
    expect(payload.state).toBe("on");
    // brightnessPct: Math.round(128 / 255 * 100) = 50
    expect(payload.attributes.brightnessPct).toBe(50);
    // Raw HA attribute must not leak through
    expect("friendly_name" in payload.attributes).toBe(false);
    expect("brightness" in payload.attributes).toBe(false);
  });

  it("broadcasts { id, removed: true } when new_state is null", () => {
    fakeClient.emit("state_changed", {
      entity_id: "light.ceiling_lights",
      new_state: null,
      old_state: {
        entity_id: "light.ceiling_lights",
        state: "on",
        attributes: {},
        last_changed: null,
      },
    });

    expect(broadcastSpy).toHaveBeenCalledOnce();
    const [eventName, payload] = broadcastSpy.mock.calls[0];
    expect(eventName).toBe("state_changed");
    expect(payload).toEqual({ id: "light.ceiling_lights", removed: true });
  });

  it("does not broadcast state changes for internal entities", () => {
    for (const entityId of [
      "group.all_lights",
      "automation.morning_routine",
      "script.goodnight",
    ]) {
      fakeClient.emit("state_changed", {
        entity_id: entityId,
        new_state: {
          entity_id: entityId,
          state: "on",
          attributes: { friendly_name: "Internal" },
          last_changed: null,
        },
        old_state: null,
      });
    }

    expect(broadcastSpy).not.toHaveBeenCalled();
  });
});
