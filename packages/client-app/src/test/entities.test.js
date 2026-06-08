import { describe, it, expect, beforeEach } from "vitest";
import { useEntityStore } from "../store/entities.js";

const ENTITY = {
  id: "light.ceiling",
  domain: "light",
  name: "Ceiling",
  state: "on",
  attributes: { brightnessPct: 50 },
  lastChanged: null,
};

beforeEach(() => {
  useEntityStore.setState({ entities: new Map() });
});

describe("entity store", () => {
  it("starts with an empty entities map", () => {
    expect(useEntityStore.getState().entities.size).toBe(0);
  });

  it("setEntity adds an entity", () => {
    useEntityStore.getState().setEntity(ENTITY);
    expect(useEntityStore.getState().entities.get("light.ceiling")).toEqual(
      ENTITY,
    );
  });

  it("setEntity updates an existing entity in place", () => {
    useEntityStore.getState().setEntity(ENTITY);
    useEntityStore.getState().setEntity({ ...ENTITY, state: "off" });
    expect(useEntityStore.getState().entities.get("light.ceiling").state).toBe(
      "off",
    );
    expect(useEntityStore.getState().entities.size).toBe(1);
  });

  it("removeEntity deletes the entity by id", () => {
    useEntityStore.getState().setEntity(ENTITY);
    useEntityStore.getState().removeEntity("light.ceiling");
    expect(useEntityStore.getState().entities.has("light.ceiling")).toBe(false);
  });

  it("removeEntity is a no-op for unknown id", () => {
    useEntityStore.getState().removeEntity("light.does_not_exist");
    expect(useEntityStore.getState().entities.size).toBe(0);
  });
});
