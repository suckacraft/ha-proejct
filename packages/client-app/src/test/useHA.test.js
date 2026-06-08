import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// callService is now a standalone function in src/lib/callService.js — see callService.test.js
import { renderHook, act, waitFor } from "@testing-library/react";
import { useHA } from "../hooks/useHA.js";
import { useEntityStore } from "../store/entities.js";

class MockEventSource {
  static instance = null;

  constructor(url) {
    this.url = url;
    this.readyState = MockEventSource.CONNECTING;
    this._listeners = {};
    MockEventSource.instance = this;
  }

  addEventListener(type, handler) {
    this._listeners[type] = handler;
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  // Test helper: simulate an incoming SSE event
  emit(type, data) {
    this._listeners[type]?.({ data: JSON.stringify(data) });
  }
}
MockEventSource.CONNECTING = 0;
MockEventSource.OPEN = 1;
MockEventSource.CLOSED = 2;

beforeEach(() => {
  vi.stubGlobal("EventSource", MockEventSource);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ json: () => Promise.resolve([]) }),
  );
  useEntityStore.setState({ entities: new Map() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useHA", () => {
  it("opens EventSource on /api/events", () => {
    renderHook(() => useHA());
    expect(MockEventSource.instance.url).toBe("/api/events");
  });

  it("fetches /api/entities on mount and seeds the store", async () => {
    const snapshot = [
      {
        id: "light.ceiling",
        domain: "light",
        name: "Ceiling",
        state: "on",
        attributes: { brightnessPct: 75 },
        lastChanged: null,
      },
      {
        id: "switch.fan",
        domain: "switch",
        name: "Fan",
        state: "off",
        attributes: {},
        lastChanged: null,
      },
    ];
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve(snapshot),
    });

    renderHook(() => useHA());

    await waitFor(() => {
      expect(useEntityStore.getState().entities.size).toBe(2);
    });

    expect(fetch).toHaveBeenCalledWith("/api/entities");
    expect(useEntityStore.getState().entities.get("light.ceiling")?.name).toBe(
      "Ceiling",
    );
    expect(useEntityStore.getState().entities.get("switch.fan")?.name).toBe(
      "Fan",
    );
  });

  it("SSE state_changed updates store with normalized entity — live update without refresh", () => {
    // This test encodes the real-time sync contract:
    // ha-core broadcasts the normalized envelope { id, domain, name, state, attributes, lastChanged }
    // NOT the raw HA shape { entity_id, new_state, old_state }.
    // useHA must key the store by entity.id so tiles re-render without a page refresh.
    renderHook(() => useHA());
    const entity = {
      id: "light.ceiling",
      domain: "light",
      name: "Ceiling",
      state: "on",
      attributes: { brightnessPct: 50 },
      lastChanged: null,
    };

    act(() => {
      MockEventSource.instance.emit("state_changed", entity);
    });

    const stored = useEntityStore.getState().entities.get("light.ceiling");
    expect(stored).toEqual(entity);
    // Guard: raw HA fields must not be present — would indicate ha-core is not normalising
    expect(stored).not.toHaveProperty("entity_id");
    expect(stored).not.toHaveProperty("new_state");
  });

  it("SSE state_changed updates existing entity state without page refresh", () => {
    // Seed store with initial state (simulates page load snapshot)
    const initial = {
      id: "light.ceiling",
      domain: "light",
      name: "Ceiling",
      state: "off",
      attributes: { brightnessPct: null },
      lastChanged: "2026-06-08T10:00:00.000Z",
    };
    useEntityStore.setState({
      entities: new Map([["light.ceiling", initial]]),
    });

    renderHook(() => useHA());

    // SSE event arrives — device was turned on in HA
    act(() => {
      MockEventSource.instance.emit("state_changed", {
        id: "light.ceiling",
        domain: "light",
        name: "Ceiling",
        state: "on",
        attributes: { brightnessPct: 70 },
        lastChanged: "2026-06-08T10:00:05.000Z",
      });
    });

    const updated = useEntityStore.getState().entities.get("light.ceiling");
    expect(updated.state).toBe("on");
    expect(updated.attributes.brightnessPct).toBe(70);
    expect(updated.lastChanged).toBe("2026-06-08T10:00:05.000Z");
  });

  it("calls removeEntity when state_changed payload has removed: true", () => {
    const entity = {
      id: "light.ceiling",
      domain: "light",
      name: "Ceiling",
      state: "on",
      attributes: {},
      lastChanged: null,
    };
    useEntityStore.setState({ entities: new Map([["light.ceiling", entity]]) });

    renderHook(() => useHA());

    act(() => {
      MockEventSource.instance.emit("state_changed", {
        id: "light.ceiling",
        removed: true,
      });
    });

    expect(useEntityStore.getState().entities.has("light.ceiling")).toBe(false);
  });
});
