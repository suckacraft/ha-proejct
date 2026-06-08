import { describe, it, expect, beforeAll, afterAll } from "vitest";
import client from "../src/ws-client.js";
import {
  normaliseEntities,
  getEntitiesByDomain,
  HANDLED_DOMAINS,
} from "../src/entities.js";

const HASS_TOKEN = process.env.HASS_TOKEN;

// Spec test for Stage 2: connect to live HA, normalise the real entity cache,
// and log normalised entities grouped by domain to confirm the internal shape
// holds against real data. Skipped automatically when HASS_TOKEN is unset.
describe.skipIf(!HASS_TOKEN)("entities -- live HA normalisation", () => {
  beforeAll(async () => {
    client.connect();
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline && client.getAllStates().size === 0) {
      await new Promise((r) => setTimeout(r, 300));
    }
  });

  afterAll(() => client.disconnect());

  it("normalises every cached entity into the internal envelope", () => {
    const raw = [...client.getAllStates().values()];
    expect(raw.length).toBeGreaterThan(0);

    const entities = normaliseEntities(raw);
    expect(entities.length).toBeGreaterThan(0);

    // No internal entities leaked through.
    for (const e of entities) {
      expect(e.id.startsWith("automation.")).toBe(false);
      expect(e.id.startsWith("script.")).toBe(false);
      expect(e.id.startsWith("group.")).toBe(false);
      // Envelope contract holds.
      expect(Object.keys(e).sort()).toEqual(
        ["attributes", "domain", "id", "lastChanged", "name", "state"].sort(),
      );
      expect("friendly_name" in e.attributes).toBe(false);
    }
  });

  it("logs normalised entities grouped by domain", () => {
    const entities = normaliseEntities([...client.getAllStates().values()]);
    const domains = [...new Set(entities.map((e) => e.domain))].sort();

    console.log(
      `\nNormalised ${entities.length} entities across ${domains.length} domains:`,
    );
    for (const domain of domains) {
      const inDomain = getEntitiesByDomain(domain, entities);
      const handled = HANDLED_DOMAINS.includes(domain)
        ? "(handled)"
        : "(passthrough)";
      const sample = inDomain[0];
      console.log(
        `  ${domain} ${handled}: ${inDomain.length} | e.g. ${sample.name} = ${sample.state}`,
      );
      if (HANDLED_DOMAINS.includes(domain)) {
        console.log(`      attrs: ${JSON.stringify(sample.attributes)}`);
      }
    }
    expect(domains.length).toBeGreaterThan(0);
  });
});
