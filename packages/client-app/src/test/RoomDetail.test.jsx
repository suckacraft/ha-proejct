import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RoomDetail from "../components/rooms/RoomDetail.jsx";
import { useEntityStore } from "../store/entities.js";
import { usePreferencesStore } from "../store/preferences.js";

// Prevent real API calls from the preferences store actions.
vi.mock("../lib/savePreference.js", () => ({
  savePreference: vi.fn().mockResolvedValue(undefined),
}));

// Prevent real HA service calls from the Apply action.
vi.mock("../lib/callService.js", () => ({
  callService: vi.fn(),
}));

import { callService } from "../lib/callService.js";

const ROOMS = [
  {
    id: "living-room",
    name: "Living Room",
    entityIds: ["light.ceiling", "sensor.temp"],
  },
  { id: "empty-room", name: "Empty Room", entityIds: [] },
];

const LIGHT_ON = {
  id: "light.ceiling",
  domain: "light",
  name: "Ceiling",
  state: "on",
  attributes: { brightnessPct: 75, supportedColorModes: ["brightness"] },
  lastChanged: null,
};

function renderDetail(roomId) {
  return render(
    <MemoryRouter initialEntries={[`/rooms/${roomId}`]}>
      <Routes>
        <Route path="/rooms/:roomId" element={<RoomDetail rooms={ROOMS} />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useEntityStore.setState({ entities: new Map() });
  usePreferencesStore.setState({ favourites: [], roomDefaults: {} });
  vi.clearAllMocks();
});

describe("RoomDetail", () => {
  it("renders room name as heading", () => {
    renderDetail("living-room");
    expect(screen.getByText("Living Room")).toBeInTheDocument();
  });

  it("renders skeleton tiles for entities not in store", () => {
    renderDetail("living-room");
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(2);
  });

  it("renders tile when entity is in store", () => {
    useEntityStore.setState({
      entities: new Map([
        [
          "light.ceiling",
          {
            id: "light.ceiling",
            domain: "light",
            name: "Ceiling",
            state: "off",
            attributes: { brightnessPct: null },
            lastChanged: null,
          },
        ],
        [
          "sensor.temp",
          {
            id: "sensor.temp",
            domain: "sensor",
            name: "Temperature",
            state: "22.5",
            attributes: { unit: "°C" },
            lastChanged: null,
          },
        ],
      ]),
    });
    renderDetail("living-room");
    expect(screen.getByText("Ceiling")).toBeInTheDocument();
    expect(screen.getByText("Temperature")).toBeInTheDocument();
  });

  it("shows 'Room not found' for unknown roomId", () => {
    renderDetail("does-not-exist");
    expect(screen.getByText(/room not found/i)).toBeInTheDocument();
  });

  it("renders no tiles for a room with no entityIds", () => {
    renderDetail("empty-room");
    expect(document.querySelectorAll(".animate-pulse").length).toBe(0);
  });

  it("uses FallbackTile for unrecognised domain", () => {
    useEntityStore.setState({
      entities: new Map([
        [
          "lock.front",
          {
            id: "lock.front",
            domain: "lock",
            name: "Front Door",
            state: "locked",
            attributes: {},
            lastChanged: null,
          },
        ],
      ]),
    });
    render(
      <MemoryRouter initialEntries={["/rooms/lock-room"]}>
        <Routes>
          <Route
            path="/rooms/:roomId"
            element={
              <RoomDetail
                rooms={[
                  {
                    id: "lock-room",
                    name: "Lock Room",
                    entityIds: ["lock.front"],
                  },
                ]}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Front Door")).toBeInTheDocument();
    expect(screen.getByText("locked")).toBeInTheDocument();
  });

  it("routes binary_sensor domain to SensorTile", () => {
    useEntityStore.setState({
      entities: new Map([
        [
          "binary_sensor.motion",
          {
            id: "binary_sensor.motion",
            domain: "binary_sensor",
            name: "Motion",
            state: "on",
            attributes: { unit: null },
            lastChanged: null,
          },
        ],
      ]),
    });
    render(
      <MemoryRouter initialEntries={["/rooms/sensor-room"]}>
        <Routes>
          <Route
            path="/rooms/:roomId"
            element={
              <RoomDetail
                rooms={[
                  {
                    id: "sensor-room",
                    name: "Sensor Room",
                    entityIds: ["binary_sensor.motion"],
                  },
                ]}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Motion")).toBeInTheDocument();
    expect(screen.getByText("on")).toBeInTheDocument();
  });
});

// ── Room default brightness ───────────────────────────────────────────────────

describe("RoomDetail — room default brightness", () => {
  it("shows 'Set default brightness' button when no default is set", () => {
    renderDetail("living-room");
    expect(
      screen.getByRole("button", { name: "Set default brightness" }),
    ).toBeInTheDocument();
  });

  it("tapping Set default saves 50% to the preferences store", () => {
    renderDetail("living-room");
    fireEvent.click(
      screen.getByRole("button", { name: "Set default brightness" }),
    );
    const { roomDefaults } = usePreferencesStore.getState();
    expect(roomDefaults["living-room"]).toEqual({ brightness: 50 });
  });

  it("shows the slider and Apply button when a default is already set", () => {
    usePreferencesStore.setState({
      roomDefaults: { "living-room": { brightness: 60 } },
      favourites: [],
    });
    renderDetail("living-room");
    expect(
      screen.getByRole("slider", { name: "Default brightness" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Apply room default brightness" }),
    ).toBeInTheDocument();
  });

  it("Apply button calls callService for each light entity at the default brightness", () => {
    useEntityStore.setState({
      entities: new Map([["light.ceiling", LIGHT_ON]]),
    });
    usePreferencesStore.setState({
      roomDefaults: { "living-room": { brightness: 60 } },
      favourites: [],
    });
    renderDetail("living-room");
    fireEvent.click(
      screen.getByRole("button", { name: "Apply room default brightness" }),
    );
    expect(callService).toHaveBeenCalledWith("light", "turn_on", {
      entity_id: "light.ceiling",
      brightness_pct: 60,
    });
  });

  it("Apply button does not call callService for non-light entities", () => {
    useEntityStore.setState({
      entities: new Map([
        ["light.ceiling", LIGHT_ON],
        [
          "sensor.temp",
          {
            id: "sensor.temp",
            domain: "sensor",
            name: "Temperature",
            state: "22.5",
            attributes: { unit: "°C" },
            lastChanged: null,
          },
        ],
      ]),
    });
    usePreferencesStore.setState({
      roomDefaults: { "living-room": { brightness: 60 } },
      favourites: [],
    });
    renderDetail("living-room");
    fireEvent.click(
      screen.getByRole("button", { name: "Apply room default brightness" }),
    );
    // Only one callService call — for the light, not the sensor
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith("light", "turn_on", {
      entity_id: "light.ceiling",
      brightness_pct: 60,
    });
  });

  it("Clear button removes the room default from the store", () => {
    usePreferencesStore.setState({
      roomDefaults: { "living-room": { brightness: 60 } },
      favourites: [],
    });
    renderDetail("living-room");
    fireEvent.click(
      screen.getByRole("button", { name: "Clear room default brightness" }),
    );
    expect(
      usePreferencesStore.getState().roomDefaults["living-room"],
    ).toBeUndefined();
  });
});
