import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createServer } from "node:http";
import express from "express";
import { createRouter } from "../src/api.js";

// Stub ws-client: no HA connection required. Pre-loaded with a couple of
// real-shaped entities from the fixtures so route logic has data to work with.
const FAKE_STATES = new Map([
  [
    "light.ceiling_lights",
    {
      entity_id: "light.ceiling_lights",
      state: "on",
      attributes: {
        brightness: 110,
        color_mode: "color_temp",
        color_temp_kelvin: 2631,
        supported_color_modes: ["color_temp", "hs"],
        friendly_name: "Ceiling Lights",
      },
      last_changed: "2026-06-08T05:20:18.232412+00:00",
    },
  ],
  [
    "lock.front_door",
    {
      entity_id: "lock.front_door",
      state: "locked",
      attributes: { friendly_name: "Front Door", supported_features: 0 },
      last_changed: "2026-06-08T03:43:23.222923+00:00",
    },
  ],
]);

const stubWsClient = {
  getAllStates: () => new Map(FAKE_STATES),
  getState: (id) => FAKE_STATES.get(id) ?? null,
  callService: vi.fn().mockResolvedValue({}),
  connected: false,
  on: () => {},
  off: () => {},
};

const CLIENT_CONFIG = {
  rooms: [
    {
      id: "living-room",
      name: "Living Room",
      entityIds: ["light.ceiling_lights"],
    },
  ],
};

let server;
let baseUrl;

beforeAll(
  () =>
    new Promise((resolve) => {
      const app = express();
      app.use(express.json());
      app.use(
        createRouter({
          wsClient: stubWsClient,
          clientConfig: CLIENT_CONFIG,
          siteId: "test-001",
        }),
      );
      server = createServer(app);
      server.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    }),
);

afterAll(() => new Promise((resolve) => server.close(resolve)));

// Convenience helpers
const get = (path) => fetch(`${baseUrl}${path}`);
const post = (path, body) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// -- /health ------------------------------------------------------------------

describe("GET /health", () => {
  it("returns 200 with required fields", async () => {
    const res = await get("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.siteId).toBe("test-001");
    expect(body).toHaveProperty("connected");
    expect(body).toHaveProperty("entityCount");
    expect(body).toHaveProperty("uptimeSeconds");
    expect(body).toHaveProperty("sseClients");
  });

  it("reports connected: false when ws-client is not connected", async () => {
    const body = await (await get("/health")).json();
    expect(body.connected).toBe(false);
  });
});

// -- /entities ----------------------------------------------------------------

describe("GET /entities", () => {
  it("returns normalised entities array", async () => {
    const res = await get("/entities");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
  });

  it("every entity has the internal envelope contract", async () => {
    const body = await (await get("/entities")).json();
    for (const e of body) {
      expect(Object.keys(e).sort()).toEqual(
        ["attributes", "domain", "id", "lastChanged", "name", "state"].sort(),
      );
      expect("friendly_name" in e.attributes).toBe(false);
    }
  });
});

describe("GET /entities/:domain", () => {
  it("filters to the requested domain", async () => {
    const body = await (await get("/entities/light")).json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.every((e) => e.domain === "light")).toBe(true);
  });

  it("returns an empty array for a domain with no entities", async () => {
    const body = await (await get("/entities/sensor")).json();
    expect(body).toEqual([]);
  });
});

describe("GET /entities/:entityId", () => {
  it("returns the single entity when the id contains a dot", async () => {
    const res = await get("/entities/light.ceiling_lights");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("light.ceiling_lights");
    expect(body.domain).toBe("light");
  });

  it("returns 404 for an unknown entity id", async () => {
    const res = await get("/entities/light.does_not_exist");
    expect(res.status).toBe(404);
  });
});

// -- /rooms -------------------------------------------------------------------

describe("GET /rooms", () => {
  it("returns the room list from config", async () => {
    const body = await (await get("/rooms")).json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("living-room");
  });
});

describe("GET /rooms/:roomId/entities", () => {
  it("returns normalised entities for the room", async () => {
    const body = await (await get("/rooms/living-room/entities")).json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("light.ceiling_lights");
  });

  it("returns empty array for unknown room", async () => {
    const body = await (await get("/rooms/garage/entities")).json();
    expect(body).toEqual([]);
  });
});

// -- /services ----------------------------------------------------------------

describe("POST /services/:domain/:service", () => {
  it("calls wsClient.callService with domain, service, and body", async () => {
    stubWsClient.callService.mockResolvedValueOnce({});
    const res = await post("/services/light/turn_on", {
      entity_id: "light.ceiling_lights",
      brightness_pct: 80,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(stubWsClient.callService).toHaveBeenCalledWith("light", "turn_on", {
      entity_id: "light.ceiling_lights",
      brightness_pct: 80,
    });
  });

  it("returns 503 when not connected", async () => {
    stubWsClient.callService.mockRejectedValueOnce(
      new Error("Not connected to Home Assistant"),
    );
    const res = await post("/services/light/turn_on", {});
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});

// -- /scenes ------------------------------------------------------------------

describe("POST /scenes/:sceneId", () => {
  it("calls scene.turn_on with the prefixed entity id", async () => {
    stubWsClient.callService.mockResolvedValueOnce({});
    const res = await post("/scenes/movie_night", {});
    expect(res.status).toBe(200);
    expect(stubWsClient.callService).toHaveBeenCalledWith(
      "scene",
      "turn_on",
      expect.objectContaining({ entity_id: "scene.movie_night" }),
    );
  });

  it("accepts an already-prefixed sceneId", async () => {
    stubWsClient.callService.mockResolvedValueOnce({});
    await post("/scenes/scene.movie_night", {});
    expect(stubWsClient.callService).toHaveBeenCalledWith(
      "scene",
      "turn_on",
      expect.objectContaining({ entity_id: "scene.movie_night" }),
    );
  });
});
