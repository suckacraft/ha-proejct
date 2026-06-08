import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SensorTile from "../components/devices/SensorTile.jsx";

const SENSOR = {
  id: "sensor.temp",
  domain: "sensor",
  name: "Temperature",
  state: "22.5",
  attributes: { unit: "°C" },
  lastChanged: null,
};

describe("SensorTile", () => {
  it("shows entity name", () => {
    render(<SensorTile entity={SENSOR} />);
    expect(screen.getByText("Temperature")).toBeInTheDocument();
  });

  it("shows state value", () => {
    render(<SensorTile entity={SENSOR} />);
    expect(screen.getByText("22.5")).toBeInTheDocument();
  });

  it("shows unit", () => {
    render(<SensorTile entity={SENSOR} />);
    expect(screen.getByText("°C")).toBeInTheDocument();
  });

  it("renders without unit when unit is null", () => {
    render(<SensorTile entity={{ ...SENSOR, attributes: { unit: null } }} />);
    expect(screen.getByText("22.5")).toBeInTheDocument();
    expect(screen.queryByText("°C")).not.toBeInTheDocument();
  });
});
