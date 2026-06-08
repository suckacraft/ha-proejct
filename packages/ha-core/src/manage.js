import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_START_TIME = Date.now();

// Resolve to the monorepo root (src → ha-core → packages → root).
const PROJECT_ROOT = join(__dirname, "..", "..", "..");

function checkHttp(url) {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      resolve(false);
    }, 1000);
    fetch(url, { signal: controller.signal })
      .then(() => {
        clearTimeout(timer);
        resolve(true);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
  });
}

function formatUptime(ms) {
  const totalMin = Math.floor(ms / 60000);
  const totalHr = Math.floor(totalMin / 60);
  const days = Math.floor(totalHr / 24);
  if (days > 0) return `${days}d ${totalHr % 24}h`;
  if (totalHr > 0) return `${totalHr}h ${totalMin % 60}m`;
  return `${totalMin}m`;
}

// Exported so tests can inject a custom exit function.
export function createManageRouter({
  exit = (code) => process.exit(code),
} = {}) {
  const router = Router();

  router.get("/manage", (_req, res) => {
    const html = readFileSync(join(__dirname, "manage.html"), "utf8");
    // Override helmet's restrictive CSP so inline scripts/styles work.
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; connect-src 'self'",
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  });

  router.get("/api/manage/status", async (_req, res) => {
    const operatorPkgPath = join(
      PROJECT_ROOT,
      "packages",
      "operator-app",
      "package.json",
    );
    const operatorBuilt = existsSync(operatorPkgPath);

    const [haUp, clientUp, operatorUp, hassUp] = await Promise.all([
      checkHttp("http://localhost:3001/health"),
      checkHttp("http://localhost:5173"),
      operatorBuilt
        ? checkHttp("http://localhost:3002")
        : Promise.resolve(false),
      checkHttp("http://localhost:8123"),
    ]);

    const services = [
      {
        name: "ha-core",
        port: 3001,
        status: haUp ? "running" : "stopped",
        uptime: haUp ? formatUptime(Date.now() - SERVER_START_TIME) : null,
        url: "http://localhost:3001",
        canRestart: true,
      },
      {
        name: "client-app",
        port: 5173,
        status: clientUp ? "running" : "stopped",
        uptime: null,
        url: "http://localhost:5173",
        canRestart: false,
      },
      {
        name: "operator-app",
        port: 3002,
        status: operatorBuilt
          ? operatorUp
            ? "running"
            : "stopped"
          : "not built",
        uptime: null,
        url: operatorBuilt ? "http://localhost:3002" : null,
        canRestart: false,
      },
      {
        name: "home-assistant",
        port: 8123,
        status: hassUp ? "running" : "stopped",
        uptime: null,
        url: "http://localhost:8123",
        canRestart: false,
      },
    ];

    res.json({
      services,
      sessionStart: new Date(SERVER_START_TIME).toISOString(),
    });
  });

  router.post("/api/manage/restart/ha-core", (_req, res) => {
    res.json({ message: "Restarting ha-core in 500ms" });
    setTimeout(() => exit(1), 500);
  });

  router.post("/api/manage/restart/:service", (req, res) => {
    const { service } = req.params;
    res.json({
      message: `Cannot restart ${service} via API. It runs in its own terminal window. Close that window and run start.bat again.`,
    });
  });

  return router;
}
