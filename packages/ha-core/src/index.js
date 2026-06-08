import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import wsClient from "./ws-client.js";
import sseManager from "./events.js";
import { createRouter } from "./api.js";

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

  app.use(
    createRouter({
      wsClient,
      clientConfig,
      siteId: haConfig.siteId,
    }),
  );

  return app;
}

// Wire ws-client state_changed events into the SSE broadcast.
function wireEvents() {
  wsClient.on("state_changed", (event) => {
    sseManager.broadcast("state_changed", event);
  });

  wsClient.on("connected", () => {
    console.log("HA WebSocket connected");
  });

  wsClient.on("disconnected", () => {
    console.log("HA WebSocket disconnected -- reconnecting...");
  });

  wsClient.on("error", (err) => {
    console.error("HA WebSocket error:", err.message);
  });
}

// Only run the server when this file is the entry point (not when imported
// in tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = createApp();
  const port = haConfig.port ?? 3001;

  sseManager.start();
  wireEvents();
  wsClient.connect();

  app.listen(port, () => {
    console.log(`ha-core listening on port ${port} (site: ${haConfig.siteId})`);
  });
}
