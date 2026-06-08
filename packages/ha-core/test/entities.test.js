import { describe, it, expect } from "vitest";
import {
  normaliseEntity,
  normaliseEntities,
  getEntitiesByDomain,
  getEntitiesByRoom,
  isInternalEntity,
  HANDLED_DOMAINS,
} from "../src/entities.js";
import * as fx from "./fixtures/entities.js";

describe("normaliseEntity -- envelope", () => {
  it("produces the internal envelope with exactly the contract keys", () => {
    const e = normaliseEntity(fx.LIGHT_ON);
    expect(Object.keys(e).sort()).toEqual(
      ["attributes", "domain", "id", "lastChanged", "name", "state"].sort(),
    );
  });

  it("derives id, domain and state verbatim", () => {
    const e = normaliseEntity(fx.LIGHT_ON);
    expect(e.id).toBe("light.ceiling_lights");
    expect(e.domain).toBe("light");
    expect(e.state).toBe("on");
    expect(e.lastChanged).toBe("2026-06-08T05:20:18.232412+00:00");
  });

  it("uses friendly_name for name and hoists it out of attributes", () => {
    const e = normaliseEntity(fx.LIGHT_ON);
    expect(e.name).toBe("Ceiling Lights");
    expect("friendly_name" in e.attributes).toBe(false);
  });

  it("humanises the object id when friendly_name is absent", () => {
    const e = normaliseEntity(fx.LIGHT_NO_NAME);
    expect(e.name).toBe("Hallway Spot 2");
  });

  it("preserves unavailable state without crashing", () => {
    const e = normaliseEntity(fx.SENSOR_UNAVAILABLE);
    expect(e.state).toBe("unavailable");
    expect(e.domain).toBe("sensor");
  });

  it("returns null for input without a usable entity_id", () => {
    expect(normaliseEntity(null)).toBeNull();
    expect(normaliseEntity({})).toBeNull();
    expect(normaliseEntity({ entity_id: "no_dot" })).toBeNull();
  });

  it("defaults missing state to unknown and lastChanged to null", () => {
    const e = normaliseEntity({ entity_id: "light.x", attributes: {} });
    expect(e.state).toBe("unknown");
    expect(e.lastChanged).toBeNull();
  });
});

describe("normaliseEntity -- light", () => {
  it("converts brightness 0-255 to brightnessPct 0-100", () => {
    expect(normaliseEntity(fx.LIGHT_ON).attributes.brightnessPct).toBe(43); // 110/255
    expect(normaliseEntity(fx.LIGHT_NO_NAME).attributes.brightnessPct).toBe(
      100,
    ); // 255/255
  });

  it("yields null brightnessPct and colour fields when the light is off", () => {
    const a = normaliseEntity(fx.LIGHT_OFF).attributes;
    expect(a.brightnessPct).toBeNull();
    expect(a.colorTempKelvin).toBeNull();
    expect(a.colorMode).toBeNull();
    expect(a.rgbColor).toBeNull();
  });

  it("exposes the stable colour contract on an active light", () => {
    const a = normaliseEntity(fx.LIGHT_ON).attributes;
    expect(a.colorTempKelvin).toBe(2631);
    expect(a.minColorTempKelvin).toBe(2000);
    expect(a.maxColorTempKelvin).toBe(6535);
    expect(a.colorMode).toBe("color_temp");
    expect(a.supportedColorModes).toEqual(["color_temp", "hs"]);
    expect(a.rgbColor).toEqual([255, 164, 82]);
  });
});

describe("normaliseEntity -- climate", () => {
  it("maps temperature/humidity and mode lists to stable keys", () => {
    const a = normaliseEntity(fx.CLIMATE_FULL).attributes;
    expect(a.currentTemperature).toBe(22);
    expect(a.targetTemperature).toBe(21); // HA "temperature" -> targetTemperature
    expect(a.hvacAction).toBe("cooling");
    expect(a.hvacModes).toContain("cool");
    expect(a.fanMode).toBe("on_high");
    expect(a.currentHumidity).toBe(54.2);
    expect(a.targetHumidity).toBe(67.4); // HA "humidity" -> targetHumidity
  });

  it("carries target_temp_high/low for heat_cool devices", () => {
    const a = normaliseEntity(fx.CLIMATE_HEAT_COOL).attributes;
    expect(a.targetTempHigh).toBe(24);
    expect(a.targetTempLow).toBe(21);
    expect(a.presetModes).toEqual(["home", "eco", "away"]);
  });
});

describe("normaliseEntity -- other handled domains", () => {
  it("sensor: unit, deviceClass, stateClass, options", () => {
    const a = normaliseEntity(fx.SENSOR_ENUM).attributes;
    expect(a.deviceClass).toBe("enum");
    expect(a.options).toContain("create_backup");
    expect(a.unit).toBeNull();
  });

  it("binary_sensor: deviceClass", () => {
    expect(
      normaliseEntity(fx.BINARY_SENSOR_MOTION).attributes.deviceClass,
    ).toBe("motion");
  });

  it("switch: deviceClass and assumedState default", () => {
    const a = normaliseEntity(fx.SWITCH_OUTLET).attributes;
    expect(a.deviceClass).toBe("outlet");
    expect(a.assumedState).toBe(false);
  });

  it("camera: entityPicture and accessToken pass through", () => {
    const a = normaliseEntity(fx.CAMERA_STREAMING).attributes;
    expect(a.accessToken).toBe("FAKE_ACCESS_TOKEN_FOR_TESTS");
    expect(a.entityPicture).toContain("/api/camera_proxy/");
    expect(a.supportedFeatures).toBe(3);
  });

  it("lock: supportedFeatures kept as a number; state carries lock status", () => {
    const e = normaliseEntity(fx.LOCK_LOCKED);
    expect(e.state).toBe("locked");
    expect(e.attributes.supportedFeatures).toBe(0);
  });

  it("media_player: media + volume contract", () => {
    const a = normaliseEntity(fx.MEDIA_PLAYER_FULL).attributes;
    expect(a.mediaTitle).toContain("Hippy");
    expect(a.mediaArtist).toBe("Technohead");
    expect(a.volumeLevel).toBe(1);
    expect(a.isMuted).toBe(false);
    expect(a.supportedFeatures).toBe(914877);
  });

  it("scene: exposes the controlled entity list", () => {
    const a = normaliseEntity(fx.SCENE).attributes;
    expect(a.entities).toEqual([
      "light.ceiling_lights",
      "media_player.living_room",
    ]);
  });

  it("every handled domain has a curator and never leaks friendly_name", () => {
    const samples = [
      fx.LIGHT_ON,
      fx.SWITCH_OUTLET,
      fx.SENSOR_ENUM,
      fx.BINARY_SENSOR_MOTION,
      fx.CLIMATE_FULL,
      fx.CAMERA_STREAMING,
      fx.LOCK_LOCKED,
      fx.MEDIA_PLAYER_FULL,
      fx.SCENE,
    ];
    for (const raw of samples) {
      const e = normaliseEntity(raw);
      expect(HANDLED_DOMAINS).toContain(e.domain);
      expect("friendly_name" in e.attributes).toBe(false);
    }
  });
});

describe("normaliseEntity -- unhandled domain passthrough", () => {
  it("passes attributes through unchanged minus friendly_name", () => {
    const e = normaliseEntity(fx.FAN_UNHANDLED);
    expect(e.domain).toBe("fan");
    expect(e.attributes).toEqual({
      percentage: 66,
      preset_mode: null,
      oscillating: true,
    });
    expect("friendly_name" in e.attributes).toBe(false);
  });
});

describe("isInternalEntity", () => {
  it("flags group/automation/script", () => {
    expect(isInternalEntity("group.all_lights")).toBe(true);
    expect(isInternalEntity("automation.x")).toBe(true);
    expect(isInternalEntity("script.y")).toBe(true);
  });

  it("does not flag product domains", () => {
    expect(isInternalEntity("light.bed_light")).toBe(false);
    expect(isInternalEntity("lock.front_door")).toBe(false);
  });

  it("respects the whitelist", () => {
    expect(isInternalEntity("script.goodnight", ["script.goodnight"])).toBe(
      false,
    );
  });
});

describe("normaliseEntities -- collection", () => {
  it("filters internal entities by default", () => {
    const out = normaliseEntities(fx.MIXED_RAW);
    const ids = out.map((e) => e.id);
    expect(ids).not.toContain("automation.morning_routine");
    expect(ids).not.toContain("script.goodnight");
    expect(ids).not.toContain("group.all_lights");
    expect(ids).toContain("light.bed_light");
  });

  it("keeps whitelisted internal entities", () => {
    const out = normaliseEntities(fx.MIXED_RAW, {
      whitelist: ["script.goodnight"],
    });
    expect(out.map((e) => e.id)).toContain("script.goodnight");
  });

  it("drops unusable input silently", () => {
    const out = normaliseEntities([null, { foo: 1 }, fx.LIGHT_ON]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("light.ceiling_lights");
  });
});

describe("getEntitiesByDomain", () => {
  it("returns only entities of the given domain", () => {
    const entities = normaliseEntities(fx.MIXED_RAW);
    const lights = getEntitiesByDomain("light", entities);
    expect(lights.map((e) => e.id).sort()).toEqual([
      "light.bed_light",
      "light.ceiling_lights",
    ]);
  });

  it("returns empty for a domain with no entities", () => {
    expect(
      getEntitiesByDomain("vacuum", normaliseEntities(fx.MIXED_RAW)),
    ).toEqual([]);
  });
});

describe("getEntitiesByRoom", () => {
  const entities = normaliseEntities(fx.MIXED_RAW);

  it("resolves a room to its entities in entityIds order", () => {
    const living = getEntitiesByRoom("living-room", entities, fx.ROOMS);
    expect(living.map((e) => e.id)).toEqual([
      "light.ceiling_lights",
      "media_player.walkman",
      "climate.hvac",
    ]);
  });

  it("skips entityIds not present in the entity set", () => {
    const bedroom = getEntitiesByRoom("bedroom", entities, fx.ROOMS);
    expect(bedroom.map((e) => e.id)).toEqual(["light.bed_light"]);
  });

  it("returns empty for an unknown room", () => {
    expect(getEntitiesByRoom("garage", entities, fx.ROOMS)).toEqual([]);
  });
});
