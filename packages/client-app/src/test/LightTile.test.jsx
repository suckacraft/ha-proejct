import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LightTile from "../components/devices/LightTile.jsx";

vi.mock("../lib/callService.js", () => ({
  callService: vi.fn(),
}));

import { callService } from "../lib/callService.js";

const LIGHT_ON = {
  id: "light.ceiling",
  domain: "light",
  name: "Ceiling",
  state: "on",
  attributes: { brightnessPct: 75 },
  lastChanged: null,
};

const LIGHT_OFF = {
  ...LIGHT_ON,
  state: "off",
  attributes: { brightnessPct: null },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LightTile", () => {
  it("shows entity name", () => {
    render(<LightTile entity={LIGHT_ON} />);
    expect(screen.getByText("Ceiling")).toBeInTheDocument();
  });

  it("shows brightness percentage when on", () => {
    render(<LightTile entity={LIGHT_ON} />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("shows Off when light is off", () => {
    render(<LightTile entity={LIGHT_OFF} />);
    expect(screen.getByText("Off")).toBeInTheDocument();
  });

  it("shows brightness slider when on and brightnessPct is set", () => {
    render(<LightTile entity={LIGHT_ON} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("hides brightness slider when off", () => {
    render(<LightTile entity={LIGHT_OFF} />);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("calls callService turn_off when toggled from on", () => {
    render(<LightTile entity={LIGHT_ON} />);
    fireEvent.click(screen.getByRole("button", { name: /turn off/i }));
    expect(callService).toHaveBeenCalledWith("light", "turn_off", {
      entity_id: "light.ceiling",
    });
  });

  it("calls callService turn_on when toggled from off", () => {
    render(<LightTile entity={LIGHT_OFF} />);
    fireEvent.click(screen.getByRole("button", { name: /turn on/i }));
    expect(callService).toHaveBeenCalledWith("light", "turn_on", {
      entity_id: "light.ceiling",
    });
  });

  it("calls callService turn_on with brightness_pct when slider changes", () => {
    render(<LightTile entity={LIGHT_ON} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "50" } });
    expect(callService).toHaveBeenCalledWith("light", "turn_on", {
      entity_id: "light.ceiling",
      brightness_pct: 50,
    });
  });
});
