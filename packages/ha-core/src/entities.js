// Entity normalisation -- the versioned internal contract.
//
// Raw Home Assistant entities are messy: attribute names are HA-specific,
// values are often null when a device is off, and the same concept (e.g.
// brightness) is expressed in HA-native units (0-255). This module is the
// single place that absorbs HA's shape so the frontend never reads a raw HA
// attribute name. When HA renames or moves an attribute, the fix lives here
// and the internal contract below stays stable. This is the layer HA updates
// are most likely to break, so it is covered by fixture-based regression tests.
//
// Public internal shape (the envelope every normalised entity has):
//   { id, domain, name, state, attributes, lastChanged }
//   - id            entity_id verbatim (e.g. "light.bed_light")
//   - domain        the part before the dot
//   - name          friendly_name, or a humanised object id as fallback
//   - state         HA state string verbatim ("on", "off", "unavailable",
//                   "unknown", "heat", "locked", a number-as-string, ...)
//   - attributes    domain-curated, camelCase, stable keys (see below).
//                   Unhandled domains pass attributes through unchanged
//                   (minus friendly_name) for forward compatibility.
//   - lastChanged   ISO 8601 string from last_changed, or null
//
// supported_features is kept as a raw number where relevant. Decoding the
// bitmask into capability booleans is a presentation concern and is
// deliberately deferred (see PROGRESS.md Stage 2 decisions).

const INTERNAL_DOMAINS = new Set(["group", "automation", "script"]);

// Brightness: HA uses 0-255. Expose a clean 0-100 percentage, null when off.
function toBrightnessPct(brightness) {
  if (brightness == null) return null;
  return Math.round((brightness / 255) * 100);
}

// Per-domain attribute curators. Each receives raw HA attributes and returns
// the stable internal attribute object. Keys are camelCase and present even
// when their value is null, so the frontend can rely on the shape.
const DOMAIN_NORMALISERS = {
  light: (a) => ({
    brightnessPct: toBrightnessPct(a.brightness),
    colorMode: a.color_mode ?? null,
    supportedColorModes: a.supported_color_modes ?? [],
    colorTempKelvin: a.color_temp_kelvin ?? null,
    minColorTempKelvin: a.min_color_temp_kelvin ?? null,
    maxColorTempKelvin: a.max_color_temp_kelvin ?? null,
    rgbColor: a.rgb_color ?? null,
    hsColor: a.hs_color ?? null,
    effect: a.effect ?? null,
    effectList: a.effect_list ?? null,
  }),

  switch: (a) => ({
    deviceClass: a.device_class ?? null,
    assumedState: a.assumed_state ?? false,
  }),

  sensor: (a) => ({
    unit: a.unit_of_measurement ?? null,
    deviceClass: a.device_class ?? null,
    stateClass: a.state_class ?? null,
    options: a.options ?? null,
  }),

  binary_sensor: (a) => ({
    deviceClass: a.device_class ?? null,
  }),

  climate: (a) => ({
    currentTemperature: a.current_temperature ?? null,
    targetTemperature: a.temperature ?? null,
    targetTempHigh: a.target_temp_high ?? null,
    targetTempLow: a.target_temp_low ?? null,
    minTemp: a.min_temp ?? null,
    maxTemp: a.max_temp ?? null,
    targetTempStep: a.target_temp_step ?? null,
    hvacModes: a.hvac_modes ?? [],
    hvacAction: a.hvac_action ?? null,
    fanMode: a.fan_mode ?? null,
    fanModes: a.fan_modes ?? null,
    presetMode: a.preset_mode ?? null,
    presetModes: a.preset_modes ?? null,
    swingMode: a.swing_mode ?? null,
    swingModes: a.swing_modes ?? null,
    currentHumidity: a.current_humidity ?? null,
    targetHumidity: a.humidity ?? null,
    minHumidity: a.min_humidity ?? null,
    maxHumidity: a.max_humidity ?? null,
  }),

  camera: (a) => ({
    entityPicture: a.entity_picture ?? null,
    accessToken: a.access_token ?? null,
    supportedFeatures: a.supported_features ?? 0,
  }),

  lock: (a) => ({
    deviceClass: a.device_class ?? null,
    supportedFeatures: a.supported_features ?? 0,
  }),

  media_player: (a) => ({
    volumeLevel: a.volume_level ?? null,
    isMuted: a.is_volume_muted ?? null,
    mediaTitle: a.media_title ?? null,
    mediaArtist: a.media_artist ?? null,
    mediaAlbumName: a.media_album_name ?? null,
    mediaContentType: a.media_content_type ?? null,
    mediaDuration: a.media_duration ?? null,
    mediaPosition: a.media_position ?? null,
    mediaPositionUpdatedAt: a.media_position_updated_at ?? null,
    appName: a.app_name ?? null,
    source: a.source ?? null,
    sourceList: a.source_list ?? null,
    soundMode: a.sound_mode ?? null,
    soundModeList: a.sound_mode_list ?? null,
    shuffle: a.shuffle ?? null,
    repeat: a.repeat ?? null,
    groupMembers: a.group_members ?? null,
    entityPicture: a.entity_picture ?? null,
    supportedFeatures: a.supported_features ?? 0,
  }),

  scene: (a) => ({
    // entity_id on a scene is the list of entities the scene controls
    entities: a.entity_id ?? [],
  }),
};

// Domains explicitly modelled with a stable contract above.
export const HANDLED_DOMAINS = Object.freeze(Object.keys(DOMAIN_NORMALISERS));

// Unhandled domains: pass attributes through unchanged so no data is lost,
// dropping only friendly_name (hoisted to name).
function defaultNormaliser(attributes) {
  const { friendly_name, ...rest } = attributes;
  return rest;
}

function humanise(objectId) {
  return objectId
    .split("_")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

// True for internal HA bookkeeping entities (group./automation./script.)
// unless the entity_id is explicitly whitelisted.
export function isInternalEntity(entityId, whitelist = []) {
  if (whitelist.includes(entityId)) return false;
  const domain = entityId.split(".")[0];
  return INTERNAL_DOMAINS.has(domain);
}

// Normalise a single raw HA entity into the internal envelope.
// Returns null for input without a usable entity_id.
export function normaliseEntity(raw) {
  if (
    !raw ||
    typeof raw.entity_id !== "string" ||
    !raw.entity_id.includes(".")
  ) {
    return null;
  }
  const [domain, ...rest] = raw.entity_id.split(".");
  const objectId = rest.join(".");
  const attributes = raw.attributes ?? {};
  const normaliser = DOMAIN_NORMALISERS[domain] ?? defaultNormaliser;

  return {
    id: raw.entity_id,
    domain,
    name: attributes.friendly_name ?? humanise(objectId),
    state: raw.state ?? "unknown",
    attributes: normaliser(attributes),
    lastChanged: raw.last_changed ?? null,
  };
}

// Normalise a collection, filtering internal entities (unless whitelisted)
// and any input that cannot be normalised.
export function normaliseEntities(rawIterable, { whitelist = [] } = {}) {
  const out = [];
  for (const raw of rawIterable) {
    if (!raw || typeof raw.entity_id !== "string") continue;
    if (isInternalEntity(raw.entity_id, whitelist)) continue;
    const normalised = normaliseEntity(raw);
    if (normalised) out.push(normalised);
  }
  return out;
}

// Filter already-normalised entities by domain.
export function getEntitiesByDomain(domain, entities) {
  return entities.filter((entity) => entity.domain === domain);
}

// Resolve a room's entities. `rooms` is the array from client.config.json,
// each { id, name, entityIds }. Order follows the room's entityIds.
export function getEntitiesByRoom(roomId, entities, rooms) {
  const room = rooms.find((r) => r.id === roomId);
  if (!room) return [];
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  return (room.entityIds ?? []).map((id) => byId.get(id)).filter(Boolean);
}

export default {
  HANDLED_DOMAINS,
  isInternalEntity,
  normaliseEntity,
  normaliseEntities,
  getEntitiesByDomain,
  getEntitiesByRoom,
};
