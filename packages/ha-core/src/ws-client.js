import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(
  readFileSync(join(__dirname, "..", "config.json"), "utf8"),
);

const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

class HAWebSocketClient extends EventEmitter {
  #url;
  #token;
  #ws = null;
  #msgId = 1;
  #cache = new Map();
  #subscribers = new Map();
  #pendingRequests = new Map(); // id -> { resolve, reject }
  #reconnectAttempts = 0;
  #reconnectTimer = null;
  #stopping = false;
  #isConnected = false;

  constructor({ url, token }) {
    super();
    this.#url = url.replace(/^http/, "ws") + "/api/websocket";
    this.#token = token;
  }

  connect() {
    this.#stopping = false;
    this.#ws = new WebSocket(this.#url);

    this.#ws.addEventListener("message", ({ data }) => {
      try {
        this.#handleMessage(JSON.parse(data));
      } catch (err) {
        this.emit("error", err);
      }
    });

    this.#ws.addEventListener("close", () => {
      this.#isConnected = false;
      if (!this.#stopping) {
        this.emit("disconnected");
        this.#scheduleReconnect();
      }
    });

    this.#ws.addEventListener("error", (err) => {
      this.emit("error", err);
    });
  }

  #handleMessage(msg) {
    switch (msg.type) {
      case "auth_required":
        this.#send({ type: "auth", access_token: this.#token });
        break;

      case "auth_ok": {
        this.#reconnectAttempts = 0;
        this.#isConnected = true;

        this.#send({
          id: this.#msgId++,
          type: "subscribe_events",
          event_type: "state_changed",
        });

        const statesId = this.#msgId++;
        this.#pendingRequests.set(statesId, {
          resolve: (states) => {
            for (const state of states) {
              this.#cache.set(state.entity_id, state);
            }
          },
          reject: (err) => this.emit("error", err),
        });
        this.#send({ id: statesId, type: "get_states" });

        this.emit("connected");
        break;
      }

      case "auth_invalid":
        this.#stopping = true;
        this.emit(
          "error",
          new Error("HA authentication failed -- check HASS_TOKEN"),
        );
        break;

      case "event": {
        if (msg.event?.event_type === "state_changed") {
          const { entity_id, new_state, old_state } = msg.event.data;
          if (new_state) {
            this.#cache.set(entity_id, new_state);
          }
          const event = { entity_id, new_state, old_state };
          this.emit("state_changed", event);
          this.#subscribers.get(entity_id)?.forEach((cb) => cb(event));
        }
        break;
      }

      case "result": {
        const handler = this.#pendingRequests.get(msg.id);
        if (handler) {
          this.#pendingRequests.delete(msg.id);
          if (msg.success) {
            handler.resolve(msg.result);
          } else {
            handler.reject(
              new Error(
                `HA request ${msg.id} failed: ${JSON.stringify(msg.error)}`,
              ),
            );
          }
        }
        break;
      }
    }
  }

  #send(msg) {
    if (this.#ws?.readyState === WebSocket.OPEN) {
      this.#ws.send(JSON.stringify(msg));
    }
  }

  #scheduleReconnect() {
    const delay = Math.min(
      BACKOFF_BASE_MS * 2 ** this.#reconnectAttempts,
      BACKOFF_MAX_MS,
    );
    this.#reconnectAttempts++;
    this.#reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    this.#stopping = true;
    clearTimeout(this.#reconnectTimer);
    this.#ws?.close();
  }

  getState(entityId) {
    return this.#cache.get(entityId) ?? null;
  }

  getAllStates() {
    return new Map(this.#cache);
  }

  subscribe(entityId, callback) {
    if (!this.#subscribers.has(entityId)) {
      this.#subscribers.set(entityId, new Set());
    }
    this.#subscribers.get(entityId).add(callback);
    return () => this.#subscribers.get(entityId)?.delete(callback);
  }

  callService(domain, service, serviceData = {}) {
    if (!this.#isConnected) {
      return Promise.reject(new Error("Not connected to Home Assistant"));
    }
    return new Promise((resolve, reject) => {
      const id = this.#msgId++;
      const timer = setTimeout(() => {
        this.#pendingRequests.delete(id);
        reject(
          new Error(`Service call ${domain}.${service} timed out after 10s`),
        );
      }, 10_000);
      this.#pendingRequests.set(id, {
        resolve: (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
      this.#send({
        id,
        type: "call_service",
        domain,
        service,
        service_data: serviceData,
      });
    });
  }

  get connected() {
    return this.#isConnected;
  }
}

export default new HAWebSocketClient({
  url: config.homeAssistant.url,
  token: process.env.HASS_TOKEN ?? config.homeAssistant.token,
});
