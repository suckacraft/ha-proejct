// Real HA entity shapes captured from a live Home Assistant demo instance
// (118 entities, HA 2026.x). These drive the normalisation regression tests:
// if an HA upgrade changes an attribute name or shape, a test here fails
// before a client ever sees it. Camera/media proxy tokens are replaced with
// obvious placeholders -- never commit real tokens.

export const LIGHT_OFF = {
  entity_id: "light.bed_light",
  state: "off",
  attributes: {
    min_color_temp_kelvin: 2000,
    max_color_temp_kelvin: 6535,
    effect_list: ["rainbow", "off"],
    supported_color_modes: ["color_temp", "hs"],
    effect: null,
    color_mode: null,
    brightness: null,
    color_temp_kelvin: null,
    hs_color: null,
    rgb_color: null,
    xy_color: null,
    friendly_name: "Bed Light",
    supported_features: 4,
  },
  last_changed: "2026-06-08T05:19:24.471872+00:00",
  last_updated: "2026-06-08T05:19:24.471872+00:00",
};

export const LIGHT_ON = {
  entity_id: "light.ceiling_lights",
  state: "on",
  attributes: {
    min_color_temp_kelvin: 2000,
    max_color_temp_kelvin: 6535,
    supported_color_modes: ["color_temp", "hs"],
    color_mode: "color_temp",
    brightness: 110,
    color_temp_kelvin: 2631,
    hs_color: [28.55, 67.974],
    rgb_color: [255, 164, 82],
    xy_color: [0.532, 0.388],
    friendly_name: "Ceiling Lights",
    supported_features: 0,
  },
  last_changed: "2026-06-08T05:20:18.232412+00:00",
  last_updated: "2026-06-08T05:20:19.908622+00:00",
};

export const SWITCH_OUTLET = {
  entity_id: "switch.ac",
  state: "off",
  attributes: {
    device_class: "outlet",
    friendly_name: "AC",
  },
  last_changed: "2026-06-08T03:43:23.231661+00:00",
  last_updated: "2026-06-08T03:43:23.231661+00:00",
};

export const SENSOR_ENUM = {
  entity_id: "sensor.backup_backup_manager_state",
  state: "idle",
  attributes: {
    options: [
      "idle",
      "create_backup",
      "blocked",
      "receive_backup",
      "restore_backup",
    ],
    device_class: "enum",
    friendly_name: "Backup Backup Manager state",
  },
  last_changed: "2026-06-08T03:43:24.429282+00:00",
  last_updated: "2026-06-08T03:43:24.429282+00:00",
};

export const SENSOR_TIMESTAMP_UNKNOWN = {
  entity_id: "sensor.backup_last_successful_automatic_backup",
  state: "unknown",
  attributes: {
    device_class: "timestamp",
    friendly_name: "Backup Last successful automatic backup",
  },
  last_changed: "2026-06-08T03:43:21.615182+00:00",
  last_updated: "2026-06-08T03:43:21.615182+00:00",
};

export const BINARY_SENSOR_MOTION = {
  entity_id: "binary_sensor.movement_backyard",
  state: "on",
  attributes: {
    device_class: "motion",
    friendly_name: "Movement Backyard",
  },
  last_changed: "2026-06-08T03:43:23.213352+00:00",
  last_updated: "2026-06-08T03:43:23.213352+00:00",
};

export const CLIMATE_FULL = {
  entity_id: "climate.hvac",
  state: "cool",
  attributes: {
    hvac_modes: ["off", "heat", "cool", "auto", "dry", "fan_only"],
    min_temp: 7,
    max_temp: 35,
    min_humidity: 30,
    max_humidity: 99,
    target_humidity_step: 5,
    fan_modes: ["on_low", "on_high", "auto_low", "auto_high", "off"],
    swing_modes: ["auto", "1", "2", "3", "off"],
    swing_horizontal_modes: ["auto", "rangefull", "off"],
    current_temperature: 22,
    temperature: 21,
    target_temp_high: null,
    target_temp_low: null,
    current_humidity: 54.2,
    humidity: 67.4,
    fan_mode: "on_high",
    hvac_action: "cooling",
    swing_mode: "off",
    swing_horizontal_mode: "auto",
    friendly_name: "Hvac",
    supported_features: 943,
  },
  last_changed: "2026-06-08T03:43:23.216323+00:00",
  last_updated: "2026-06-08T03:43:23.216323+00:00",
};

export const CLIMATE_HEAT_COOL = {
  entity_id: "climate.ecobee",
  state: "heat_cool",
  attributes: {
    hvac_modes: ["off", "cool", "heat_cool", "auto", "dry", "fan_only"],
    min_temp: 7,
    max_temp: 35,
    fan_modes: ["on_low", "on_high", "auto_low", "auto_high", "off"],
    preset_modes: ["home", "eco", "away"],
    current_temperature: 23,
    target_temp_high: 24,
    target_temp_low: 21,
    fan_mode: "auto_low",
    preset_mode: "home",
    friendly_name: "Ecobee",
    supported_features: 442,
  },
  last_changed: "2026-06-08T03:43:23.216618+00:00",
  last_updated: "2026-06-08T03:43:23.216618+00:00",
};

export const CAMERA_STREAMING = {
  entity_id: "camera.demo_camera",
  state: "streaming",
  attributes: {
    access_token: "FAKE_ACCESS_TOKEN_FOR_TESTS",
    entity_picture:
      "/api/camera_proxy/camera.demo_camera?token=FAKE_ACCESS_TOKEN_FOR_TESTS",
    friendly_name: "Demo camera",
    supported_features: 3,
  },
  last_changed: "2026-06-08T03:43:23.214029+00:00",
  last_updated: "2026-06-08T05:33:21.519920+00:00",
};

export const LOCK_LOCKED = {
  entity_id: "lock.front_door",
  state: "locked",
  attributes: {
    friendly_name: "Front Door",
    supported_features: 0,
  },
  last_changed: "2026-06-08T03:43:23.222923+00:00",
  last_updated: "2026-06-08T03:43:23.222923+00:00",
};

export const MEDIA_PLAYER_FULL = {
  entity_id: "media_player.walkman",
  state: "playing",
  attributes: {
    sound_mode_list: ["Music", "Movie"],
    group_members: [],
    volume_level: 1,
    is_volume_muted: false,
    media_content_id: "bounzz-1",
    media_content_type: "music",
    media_duration: 213,
    media_title: "I Wanna Be A Hippy (Flamman & Abraxas Radio Mix)",
    media_artist: "Technohead",
    media_album_name: "Bounzz",
    media_track: 1,
    sound_mode: "Music",
    shuffle: false,
    repeat: "off",
    entity_picture:
      "/api/media_player_proxy/media_player.walkman?token=FAKE_MEDIA_TOKEN",
    friendly_name: "Walkman",
    supported_features: 914877,
  },
  last_changed: "2026-06-08T03:43:23.223920+00:00",
  last_updated: "2026-06-08T03:43:23.223920+00:00",
};

// Scenes were not present in the demo instance. This is the documented HA
// scene shape: state is the last-activated timestamp, attributes.entity_id
// lists the entities the scene controls.
export const SCENE = {
  entity_id: "scene.movie_night",
  state: "2026-06-08T03:43:23.000000+00:00",
  attributes: {
    entity_id: ["light.ceiling_lights", "media_player.living_room"],
    id: "1717800000000",
    friendly_name: "Movie Night",
  },
  last_changed: "2026-06-08T03:43:23.000000+00:00",
  last_updated: "2026-06-08T03:43:23.000000+00:00",
};

// Edge cases.

// No friendly_name -> name must be humanised from the object id.
export const LIGHT_NO_NAME = {
  entity_id: "light.hallway_spot_2",
  state: "on",
  attributes: {
    brightness: 255,
    supported_color_modes: ["brightness"],
    color_mode: "brightness",
  },
  last_changed: "2026-06-08T03:43:23.000000+00:00",
  last_updated: "2026-06-08T03:43:23.000000+00:00",
};

// Unavailable entity -> state preserved verbatim, no crash.
export const SENSOR_UNAVAILABLE = {
  entity_id: "sensor.outdoor_temperature",
  state: "unavailable",
  attributes: {
    friendly_name: "Outdoor Temperature",
  },
  last_changed: "2026-06-08T03:43:23.000000+00:00",
  last_updated: "2026-06-08T03:43:23.000000+00:00",
};

// Unhandled domain (fan) -> attributes pass through minus friendly_name.
export const FAN_UNHANDLED = {
  entity_id: "fan.living_room",
  state: "on",
  attributes: {
    percentage: 66,
    preset_mode: null,
    oscillating: true,
    friendly_name: "Living Room Fan",
  },
  last_changed: "2026-06-08T03:43:23.000000+00:00",
  last_updated: "2026-06-08T03:43:23.000000+00:00",
};

// Internal entities that must be filtered out unless whitelisted.
export const AUTOMATION_INTERNAL = {
  entity_id: "automation.morning_routine",
  state: "on",
  attributes: { friendly_name: "Morning Routine", last_triggered: null },
  last_changed: "2026-06-08T03:43:23.000000+00:00",
  last_updated: "2026-06-08T03:43:23.000000+00:00",
};

export const SCRIPT_INTERNAL = {
  entity_id: "script.goodnight",
  state: "off",
  attributes: { friendly_name: "Goodnight" },
  last_changed: "2026-06-08T03:43:23.000000+00:00",
  last_updated: "2026-06-08T03:43:23.000000+00:00",
};

export const GROUP_INTERNAL = {
  entity_id: "group.all_lights",
  state: "on",
  attributes: { friendly_name: "All Lights", entity_id: ["light.bed_light"] },
  last_changed: "2026-06-08T03:43:23.000000+00:00",
  last_updated: "2026-06-08T03:43:23.000000+00:00",
};

// A representative mixed collection for the collection-level tests.
export const MIXED_RAW = [
  LIGHT_OFF,
  LIGHT_ON,
  SWITCH_OUTLET,
  SENSOR_ENUM,
  BINARY_SENSOR_MOTION,
  CLIMATE_FULL,
  CAMERA_STREAMING,
  LOCK_LOCKED,
  MEDIA_PLAYER_FULL,
  FAN_UNHANDLED,
  AUTOMATION_INTERNAL,
  SCRIPT_INTERNAL,
  GROUP_INTERNAL,
];

// Example rooms as they would appear in client.config.json.
export const ROOMS = [
  {
    id: "living-room",
    name: "Living Room",
    entityIds: ["light.ceiling_lights", "media_player.walkman", "climate.hvac"],
  },
  {
    id: "bedroom",
    name: "Bedroom",
    entityIds: ["light.bed_light"],
  },
];
