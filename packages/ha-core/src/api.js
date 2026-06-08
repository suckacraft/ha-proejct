import { Router } from "express";
import {
  normaliseEntities,
  getEntitiesByDomain,
  getEntitiesByRoom,
} from "./entities.js";
import sseManager from "./events.js";

const START_TIME = Date.now();

// Returns an Express Router with all ha-core REST and SSE routes registered.
// Dependencies are injected so routes are testable without a live server.
export function createRouter({ wsClient, clientConfig, siteId }) {
  const router = Router();

  // -- Entities ---------------------------------------------------------------

  router.get("/entities", (_req, res) => {
    const entities = normaliseEntities([...wsClient.getAllStates().values()]);
    res.json(entities);
  });

  // Handles both /entities/:domain (e.g. "light") and
  // /entities/:entityId (e.g. "light.bed_light") via the dot check.
  router.get("/entities/:param", (req, res) => {
    const { param } = req.params;
    const entities = normaliseEntities([...wsClient.getAllStates().values()]);

    if (param.includes(".")) {
      const entity = entities.find((e) => e.id === param);
      if (!entity) return res.status(404).json({ error: "Entity not found" });
      return res.json(entity);
    }

    return res.json(getEntitiesByDomain(param, entities));
  });

  // -- Rooms ------------------------------------------------------------------

  router.get("/rooms", (_req, res) => {
    res.json(clientConfig.rooms ?? []);
  });

  router.get("/rooms/:roomId/entities", (req, res) => {
    const entities = normaliseEntities([...wsClient.getAllStates().values()]);
    const roomEntities = getEntitiesByRoom(
      req.params.roomId,
      entities,
      clientConfig.rooms ?? [],
    );
    res.json(roomEntities);
  });

  // -- Services & scenes ------------------------------------------------------

  router.post("/services/:domain/:service", async (req, res) => {
    const { domain, service } = req.params;
    try {
      const result = await wsClient.callService(
        domain,
        service,
        req.body ?? {},
      );
      res.json({ ok: true, result: result ?? null });
    } catch (err) {
      const status = err.message.includes("Not connected") ? 503 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  router.post("/scenes/:sceneId", async (req, res) => {
    const raw = req.params.sceneId;
    // Accept both "movie_night" and "scene.movie_night"
    const entityId = raw.startsWith("scene.") ? raw : `scene.${raw}`;
    try {
      await wsClient.callService("scene", "turn_on", { entity_id: entityId });
      res.json({ ok: true, sceneId: entityId });
    } catch (err) {
      const status = err.message.includes("Not connected") ? 503 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // -- SSE --------------------------------------------------------------------

  router.get("/events", (req, res) => {
    sseManager.addClient(res);
  });

  // -- Health -----------------------------------------------------------------

  router.get("/health", (_req, res) => {
    const entities = [...wsClient.getAllStates().values()];
    res.json({
      ok: true,
      siteId,
      connected: wsClient.connected,
      entityCount: entities.length,
      sseClients: sseManager.clientCount,
      uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
    });
  });

  return router;
}
