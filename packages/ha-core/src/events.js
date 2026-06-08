// SSE (Server-Sent Events) manager.
// Tracks active browser connections and broadcasts normalised state_changed
// events to all of them. Wired to the ws-client in index.js at startup.
// SSE is the decided browser transport (more reliable through Cloudflare Tunnel
// than WebSocket -- see architecture decision 2 in HA_PROJECT_KICKOFF_PROMPT.md).

const HEARTBEAT_INTERVAL_MS = 30_000;

class SseManager {
  #clients = new Set();
  #heartbeat = null;

  start() {
    this.#heartbeat = setInterval(() => {
      this.#write(": heartbeat\n\n");
    }, HEARTBEAT_INTERVAL_MS);
    this.#heartbeat.unref();
  }

  stop() {
    clearInterval(this.#heartbeat);
  }

  addClient(res) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(": connected\n\n");
    this.#clients.add(res);
    res.on("close", () => this.#clients.delete(res));
  }

  broadcast(eventName, data) {
    this.#write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  #write(payload) {
    for (const res of this.#clients) {
      res.write(payload);
    }
  }

  get clientCount() {
    return this.#clients.size;
  }
}

export default new SseManager();
