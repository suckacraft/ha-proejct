import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SwitchTile from "../components/devices/SwitchTile.jsx";

vi.mock("../lib/callService.js", () => ({
  callService: vi.fn(),
}));

import { callService } from "../lib/callService.js";

const SWITCH_ON = {
  id: "switch.fan",
  domain: "switch",
  name: "Fan",
  state: "on",
  attributes: {},
  lastChanged: null,
};

const SWITCH_OFF = { ...SWITCH_ON, state: "off" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SwitchTile", () => {
  it("shows entity name", () => {
    render(<SwitchTile entity={SWITCH_ON} />);
    expect(screen.getByText("Fan")).toBeInTheDocument();
  });

  it("shows On label when state is on", () => {
    render(<SwitchTile entity={SWITCH_ON} />);
    expect(screen.getByText("On")).toBeInTheDocument();
  });

  it("shows Off label when state is off", () => {
    render(<SwitchTile entity={SWITCH_OFF} />);
    expect(screen.getByText("Off")).toBeInTheDocument();
  });

  it("calls turn_off when toggled from on", () => {
    render(<SwitchTile entity={SWITCH_ON} />);
    fireEvent.click(screen.getByRole("button", { name: /turn off/i }));
    expect(callService).toHaveBeenCalledWith("switch", "turn_off", {
      entity_id: "switch.fan",
    });
  });

  it("calls turn_on when toggled from off", () => {
    render(<SwitchTile entity={SWITCH_OFF} />);
    fireEvent.click(screen.getByRole("button", { name: /turn on/i }));
    expect(callService).toHaveBeenCalledWith("switch", "turn_on", {
      entity_id: "switch.fan",
    });
  });
});
