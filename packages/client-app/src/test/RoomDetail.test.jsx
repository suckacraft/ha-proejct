import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RoomDetail from "../components/rooms/RoomDetail.jsx";
import { useEntityStore } from "../store/entities.js";

const ROOMS = [
  {
    id: "living-room",
    name: "Living Room",
    entityIds: ["light.ceiling", "sensor.temp"],
  },
  { id: "empty-room", name: "Empty Room", entityIds: [] },
];

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
