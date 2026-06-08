import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ClimateTile from "../components/devices/ClimateTile.jsx";

vi.mock("../lib/callService.js", () => ({
  callService: vi.fn(),
}));

import { callService } from "../lib/callService.js";

const CLIMATE = {
  id: "climate.thermostat",
  domain: "climate",
  name: "Thermostat",
  state: "cool",
  attributes: {
    currentTemperature: 24,
    targetTemperature: 22,
    targetTempStep: 1,
    minTemp: 16,
    maxTemp: 30,
    hvacModes: ["off", "cool", "heat"],
    hvacAction: "cooling",
  },
  lastChanged: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ClimateTile", () => {
  it("shows entity name", () => {
    render(<ClimateTile entity={CLIMATE} />);
    expect(screen.getByText("Thermostat")).toBeInTheDocument();
  });

  it("shows HVAC mode badge", () => {
    render(<ClimateTile entity={CLIMATE} />);
    expect(screen.getByText("cool")).toBeInTheDocument();
  });

  it("shows current temperature", () => {
    render(<ClimateTile entity={CLIMATE} />);
    expect(screen.getByText("24°")).toBeInTheDocument();
  });

  it("shows target temperature", () => {
    render(<ClimateTile entity={CLIMATE} />);
    expect(screen.getByText("22°")).toBeInTheDocument();
  });

  it("calls set_temperature +1 on increase button", () => {
    render(<ClimateTile entity={CLIMATE} />);
    fireEvent.click(
      screen.getByRole("button", { name: /increase temperature/i }),
    );
    expect(callService).toHaveBeenCalledWith("climate", "set_temperature", {
      entity_id: "climate.thermostat",
      temperature: 23,
    });
  });

  it("calls set_temperature -1 on decrease button", () => {
    render(<ClimateTile entity={CLIMATE} />);
    fireEvent.click(
      screen.getByRole("button", { name: /decrease temperature/i }),
    );
    expect(callService).toHaveBeenCalledWith("climate", "set_temperature", {
      entity_id: "climate.thermostat",
      temperature: 21,
    });
  });

  it("shows dash when targetTemperature is null", () => {
    render(
      <ClimateTile
        entity={{
          ...CLIMATE,
          attributes: { ...CLIMATE.attributes, targetTemperature: null },
        }}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("falls back to currentTemperature as base when targetTemperature is null", () => {
    render(
      <ClimateTile
        entity={{
          ...CLIMATE,
          attributes: { ...CLIMATE.attributes, targetTemperature: null },
        }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /increase temperature/i }),
    );
    expect(callService).toHaveBeenCalledWith("climate", "set_temperature", {
      entity_id: "climate.thermostat",
      temperature: 25,
    });
  });

  it("uses targetTempStep as increment when step != 1", () => {
    render(
      <ClimateTile
        entity={{
          ...CLIMATE,
          attributes: {
            ...CLIMATE.attributes,
            targetTemperature: 20,
            targetTempStep: 0.5,
          },
        }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /increase temperature/i }),
    );
    expect(callService).toHaveBeenCalledWith("climate", "set_temperature", {
      entity_id: "climate.thermostat",
      temperature: 20.5,
    });
  });
});
