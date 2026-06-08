import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// callService is now a standalone function in src/lib/callService.js — see callService.test.js
import { renderHook, act } from "@testing-library/react";
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

  it("calls setEntity on state_changed SSE event with entity payload", () => {
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

    expect(useEntityStore.getState().entities.get("light.ceiling")).toEqual(
      entity,
    );
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
