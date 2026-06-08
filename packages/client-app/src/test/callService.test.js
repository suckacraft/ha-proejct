import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callService } from "../lib/callService.js";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("callService", () => {
  it("POSTs to /api/services/:domain/:service with JSON body", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    await callService("light", "turn_on", { entity_id: "light.ceiling" });

    expect(fetch).toHaveBeenCalledWith("/api/services/light/turn_on", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_id: "light.ceiling" }),
    });
  });

  it("returns parsed JSON response", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: "ok" }),
    });

    const result = await callService("switch", "turn_off", {});
    expect(result).toEqual({ result: "ok" });
  });

  it("defaults body to empty object", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await callService("scene", "turn_on");

    expect(fetch).toHaveBeenCalledWith(
      "/api/services/scene/turn_on",
      expect.objectContaining({ body: JSON.stringify({}) }),
    );
  });

  it("throws when the response is not ok", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ error: "unavailable" }),
    });

    await expect(callService("light", "turn_on", {})).rejects.toThrow(
      "Service call failed: 503",
    );
  });

  it("throws when fetch rejects (network error)", async () => {
    global.fetch.mockRejectedValue(new Error("Network error"));

    await expect(callService("light", "turn_on", {})).rejects.toThrow(
      "Network error",
    );
  });
});
