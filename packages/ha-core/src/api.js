import { Router } from "express";
import {
  normaliseEntities,
  getEntitiesByDomain,
  getEntitiesByRoom,
} from "./entities.js";
import sseManager from "./events.js";
import {
  getSiteEvents,
  getUptimeSummary,
  getDeviceHistory,
  getBackupHistory,
  getPreference,
  getAllPreferences,
  setPreference,
} from "./db.js";
import { runBackup } from "./backup.js";

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

  // -- History ----------------------------------------------------------------

  router.get("/history/events", (req, res) => {
    const { since, limit } = req.query;
    res.json(
      getSiteEvents({
        since: since ?? null,
        limit: limit ? parseInt(limit, 10) : 500,
      }),
    );
  });

  router.get("/history/uptime", (_req, res) => {
    res.json(getUptimeSummary());
  });

  router.get("/history/device/:entityId", (req, res) => {
    const { since, limit } = req.query;
    res.json(
      getDeviceHistory(req.params.entityId, {
        since: since ?? null,
        limit: limit ? parseInt(limit, 10) : 200,
      }),
    );
  });

  router.get("/history/backups", (_req, res) => {
    res.json(getBackupHistory());
  });

  // -- Preferences ------------------------------------------------------------
  // Per-site key/value store. Scoped to the injected siteId so a deployment
  // never reads another tenant's settings. All state lives here, never in the
  // browser, so the PWA and future native/kiosk surfaces stay in sync.

  router.get("/preferences", (_req, res) => {
    res.json(getAllPreferences(siteId));
  });

  router.get("/preferences/:key", (req, res) => {
    const value = getPreference(siteId, req.params.key);
    res.json({ key: req.params.key, value });
  });

  router.post("/preferences/:key", (req, res) => {
    if (!req.body || !("value" in req.body)) {
      return res
        .status(400)
        .json({ error: "Request body must include a 'value' field" });
    }
    if (req.params.key.length > 128) {
      return res
        .status(400)
        .json({ error: "Preference key must be 128 characters or fewer" });
    }
    res.json(setPreference(siteId, req.params.key, req.body.value));
  });

  // -- Backup -----------------------------------------------------------------

  router.post("/backup/run", async (_req, res) => {
    const result = await runBackup(wsClient);
    const status = result.ok ? 200 : 500;
    res.status(status).json(result);
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
