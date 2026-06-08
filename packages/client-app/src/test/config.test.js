import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../config/index.js";

describe("loadConfig", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    document.documentElement.style.removeProperty("--color-primary");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches /client.config.json and returns parsed config", async () => {
    const config = {
      clientName: "Test Home",
      colours: { primary: "#ff0000", secondary: "#aaaaaa" },
      rooms: [],
    };
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(config),
    });

    const result = await loadConfig();

    expect(fetch).toHaveBeenCalledWith("/client.config.json");
    expect(result.clientName).toBe("Test Home");
    expect(result.rooms).toEqual([]);
  });

  it("sets --color-primary CSS variable from config colours", async () => {
    const config = {
      clientName: "Test",
      colours: { primary: "#ff0000", secondary: "#aaaaaa" },
      rooms: [],
    };
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(config),
    });

    await loadConfig();

    expect(
      document.documentElement.style.getPropertyValue("--color-primary"),
    ).toBe("#ff0000");
  });
});
