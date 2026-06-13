import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import { schedule } from "node-cron";
import wsClient from "./ws-client.js";
import sseManager from "./events.js";
import { createRouter } from "./api.js";
import { createManageRouter } from "./manage.js";
import { recordSiteEvent, recordDeviceHistory, pruneOldRecords } from "./db.js";
import { runBackup } from "./backup.js";
import { normaliseEntity, isInternalEntity } from "./entities.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const haConfig = JSON.parse(
  readFileSync(join(__dirname, "..", "config.json"), "utf8"),
);

const clientConfigPath =
  process.env.CLIENT_CONFIG_PATH ??
  join(__dirname, "..", "..", "client-app", "client.config.json");

const clientConfig = JSON.parse(readFileSync(clientConfigPath, "utf8"));

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    }),
  );
  app.use(helmet());
  app.use(morgan("dev"));
  app.use(express.json());

  app.use(createManageRouter());

  app.get("/", (_req, res) => res.redirect("/manage"));

  app.use(
    "/api",
    createRouter({
      wsClient,
      clientConfig,
      siteId: haConfig.siteId,
    }),
  );

  return app;
}

// Wire ws-client events into SSE broadcast and DB recording.
// Exported for unit testing with injectable deps.
export function wireEvents(client, sse) {
  client.on("state_changed", (event) => {
    if (event.new_state === null) {
      sse.broadcast("state_changed", { id: event.entity_id, removed: true });
    } else if (!isInternalEntity(event.entity_id)) {
      const normalised = normaliseEntity(event.new_state);
      if (normalised) sse.broadcast("state_changed", normalised);
    }
    recordDeviceHistory(
      event.entity_id,
      event.new_state?.state ?? "unavailable",
      event.old_state?.state ?? null,
    );
  });

  client.on("connected", () => {
    console.log("HA WebSocket connected");
    recordSiteEvent("ha_connected");
  });

  client.on("disconnected", () => {
    console.log("HA WebSocket disconnected -- reconnecting...");
    recordSiteEvent("ha_disconnected");
  });

  client.on("error", (err) => {
    console.error("HA WebSocket error:", err.message);
  });
}

// Only run the server when this file is the entry point (not when imported
// in tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = createApp();
  const port = haConfig.port ?? 3001;

  // Prune stale records on startup, then nightly at 03:00.
  pruneOldRecords();
  schedule("0 3 * * *", () => {
    pruneOldRecords();
    console.log("History pruned");
  });

  // Nightly backup at 02:00.
  schedule("0 2 * * *", async () => {
    console.log("Starting nightly backup...");
    const result = await runBackup(wsClient);
    console.log(
      "Backup result:",
      result.ok ? "ok" : `failed -- ${result.error}`,
    );
  });

  sseManager.start();
  wireEvents(wsClient, sseManager);
  wsClient.connect();

  app.listen(port, () => {
    console.log(`ha-core listening on port ${port} (site: ${haConfig.siteId})`);
  });
}
