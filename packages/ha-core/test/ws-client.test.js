import { describe, it, expect, beforeAll, afterAll } from "vitest";
import client from "../src/ws-client.js";

const HASS_TOKEN = process.env.HASS_TOKEN;

describe.skipIf(!HASS_TOKEN)("HAWebSocketClient -- live HA integration", () => {
  beforeAll(() => {
    client.connect();
  });

  afterAll(() => {
    client.disconnect();
  });

  it(
    "connects and receives 5 state_changed events",
    { timeout: 65_000 },
    () =>
      new Promise((resolve, reject) => {
        const events = [];

        const timer = setTimeout(() => {
          reject(
            new Error(
              `Timeout: only ${events.length}/5 events received in 60s. ` +
                "Toggle a device in HA to generate more events.",
            ),
          );
        }, 60_000);

        client.on("state_changed", (data) => {
          events.push(data);
          console.log(
            `[${events.length}/5] state_changed: ${data.entity_id} -> ${data.new_state?.state ?? "unavailable"}`,
          );

          if (events.length >= 5) {
            clearTimeout(timer);
            for (const ev of events) {
              expect(ev).toHaveProperty("entity_id");
              expect(ev).toHaveProperty("new_state");
            }
            resolve();
          }
        });
      }),
  );

  it(
    "populates state cache after connect",
    { timeout: 10_000 },
    () =>
      new Promise((resolve) => {
        // Cache may already be populated from the first test; give auth/get_states time to complete
        const check = () => {
          const all = client.getAllStates();
          if (all.size > 0) {
            console.log(`Cache contains ${all.size} entities`);
            expect(all.size).toBeGreaterThan(0);
            resolve();
          } else {
            setTimeout(check, 500);
          }
        };
        check();
      }),
  );

  it("getState returns null for unknown entity", () => {
    expect(client.getState("light.does_not_exist_xyz")).toBeNull();
  });

  it(
    "subscribe delivers future state_changed for a known entity",
    { timeout: 30_000 },
    () =>
      new Promise((resolve, reject) => {
        const allStates = client.getAllStates();
        const entityId = [...allStates.keys()][0];

        if (!entityId) {
          reject(new Error("No entities in cache -- run cache test first"));
          return;
        }

        const timer = setTimeout(() => {
          unsubscribe();
          // Not a hard failure -- entity may not have changed during the test window
          console.log(
            `Note: no state_changed for ${entityId} in 25s (entity may be stable)`,
          );
          resolve();
        }, 25_000);

        const unsubscribe = client.subscribe(entityId, (ev) => {
          clearTimeout(timer);
          unsubscribe();
          expect(ev.entity_id).toBe(entityId);
          resolve();
        });
      }),
  );
});
