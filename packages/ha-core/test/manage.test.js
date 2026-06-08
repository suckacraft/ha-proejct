import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createServer } from "node:http";
import express from "express";
import { createManageRouter } from "../src/manage.js";

const mockExit = vi.fn();

let server;
let baseUrl;

beforeAll(
  () =>
    new Promise((resolve) => {
      const app = express();
      app.use(express.json());
      app.use(createManageRouter({ exit: mockExit }));
      server = createServer(app);
      server.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    }),
);

afterAll(() => new Promise((resolve) => server.close(resolve)));

const get = (path) => fetch(`${baseUrl}${path}`);
const post = (path) => fetch(`${baseUrl}${path}`, { method: "POST" });

describe("GET /manage", () => {
  it("returns 200 with HTML content", async () => {
    const res = await get("/manage");
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("<!DOCTYPE html>");
    expect(text).toContain("Smarthome Platform");
  });
});

describe("GET /api/manage/status", () => {
  it("returns 200 with valid JSON shape", async () => {
    const res = await get("/api/manage/status");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("services");
    expect(body).toHaveProperty("sessionStart");
    expect(Array.isArray(body.services)).toBe(true);
    expect(body.services).toHaveLength(4);
  });

  it("each service has the required fields", async () => {
    const { services } = await (await get("/api/manage/status")).json();
    for (const svc of services) {
      expect(svc).toHaveProperty("name");
      expect(svc).toHaveProperty("port");
      expect(svc).toHaveProperty("status");
      expect(svc).toHaveProperty("canRestart");
    }
  });

  it("ha-core has canRestart: true", async () => {
    const { services } = await (await get("/api/manage/status")).json();
    const haCore = services.find((s) => s.name === "ha-core");
    expect(haCore.canRestart).toBe(true);
  });

  it("sessionStart is a valid ISO date string", async () => {
    const { sessionStart } = await (await get("/api/manage/status")).json();
    expect(new Date(sessionStart).toISOString()).toBe(sessionStart);
  });
});

describe("POST /api/manage/restart/ha-core", () => {
  it("returns restart message and schedules exit", async () => {
    const res = await post("/api/manage/restart/ha-core");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/restarting ha-core/i);
    // Give the 500ms timer time to fire, then verify exit was called.
    await new Promise((r) => setTimeout(r, 600));
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

describe("POST /api/manage/restart/:service", () => {
  it("returns cannot-restart message for non-ha-core services", async () => {
    const res = await post("/api/manage/restart/client-app");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/cannot restart client-app/i);
    expect(body.message).toMatch(/start\.bat/i);
  });
});
