import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LightTile from "../components/devices/LightTile.jsx";

vi.mock("../lib/callService.js", () => ({
  callService: vi.fn(),
}));

import { callService } from "../lib/callService.js";

// ── Fixtures ────────────────────────────────────────────────────────────
const base = (attrs = {}, state = "on") => ({
  id: "light.test",
  domain: "light",
  name: "Test Light",
  state,
  attributes: attrs,
  lastChanged: null,
});

// onoff: no supportedColorModes, brightnessPct=null → resolveMode returns "onoff"
const ONOFF_ON = base({ brightnessPct: null });
const ONOFF_OFF = base({ brightnessPct: null }, "off");

// brightness-only
const DIM_ON = base({ brightnessPct: 60, supportedColorModes: ["brightness"] });
const DIM_OFF = base(
  { brightnessPct: null, supportedColorModes: ["brightness"] },
  "off",
);

// color_temp only
const TEMP_ON = base({
  brightnessPct: 80,
  colorTempKelvin: 3000,
  minColorTempKelvin: 2000,
  maxColorTempKelvin: 6500,
  supportedColorModes: ["color_temp"],
});

// hs colour only
const HS_ON = base({
  brightnessPct: 70,
  hsColor: [240, 100],
  supportedColorModes: ["hs"],
});
const HS_OFF = base(
  { brightnessPct: null, hsColor: null, supportedColorModes: ["hs"] },
  "off",
);

// combo: color_temp + hs
const COMBO_ON = base({
  brightnessPct: 75,
  colorTempKelvin: 4000,
  minColorTempKelvin: 2000,
  maxColorTempKelvin: 6535,
  hsColor: null,
  supportedColorModes: ["color_temp", "hs"],
});

beforeEach(() => vi.clearAllMocks());

describe("LightTile", () => {
  // ── Rendering ──────────────────────────────────────────────────────

  it("shows entity name", () => {
    render(<LightTile entity={ONOFF_ON} />);
    expect(screen.getByText("Test Light")).toBeInTheDocument();
  });

  it("shows OFF badge when off", () => {
    render(<LightTile entity={ONOFF_OFF} />);
    expect(screen.getByText("OFF")).toBeInTheDocument();
  });

  it("shows ON · X% badge when on with brightness", () => {
    render(<LightTile entity={DIM_ON} />);
    expect(screen.getByText("ON · 60%")).toBeInTheDocument();
  });

  it("shows ON badge (no %) when on without brightness (onoff mode)", () => {
    render(<LightTile entity={ONOFF_ON} />);
    expect(screen.getByText("ON")).toBeInTheDocument();
  });

  // ── Card variant (unified: every card is a div) ────────────────────

  it("renders card as a <div> in onoff mode", () => {
    const { container } = render(<LightTile entity={ONOFF_ON} />);
    expect(container.querySelector("div.rounded-2xl")).toBeInTheDocument();
    expect(
      container.querySelector("button.rounded-2xl"),
    ).not.toBeInTheDocument();
  });

  it("renders card as a <div> in dimmable mode", () => {
    const { container } = render(<LightTile entity={DIM_ON} />);
    expect(container.querySelector("div.rounded-2xl")).toBeInTheDocument();
  });

  it("rgbww light is colour-capable, not onoff (resolveMode regression)", () => {
    const rgbww = base({
      brightnessPct: 71,
      hsColor: [277, 41],
      supportedColorModes: ["rgbww"],
    });
    render(<LightTile entity={rgbww} />);
    // Colour-capable cards expose the colour circle when on
    expect(
      screen.getByRole("button", { name: "Colour settings" }),
    ).toBeInTheDocument();
  });

  // ── Power icon: present on EVERY card ──────────────────────────────

  it("shows power icon on onoff card when on", () => {
    render(<LightTile entity={ONOFF_ON} />);
    expect(
      screen.getByRole("button", { name: "Turn off" }),
    ).toBeInTheDocument();
  });

  it("shows power icon on onoff card when off", () => {
    render(<LightTile entity={ONOFF_OFF} />);
    expect(screen.getByRole("button", { name: "Turn on" })).toBeInTheDocument();
  });

  it("shows power icon on dimmable card when on", () => {
    render(<LightTile entity={DIM_ON} />);
    expect(
      screen.getByRole("button", { name: "Turn off" }),
    ).toBeInTheDocument();
  });

  it("shows power icon on dimmable card when off", () => {
    render(<LightTile entity={DIM_OFF} />);
    expect(screen.getByRole("button", { name: "Turn on" })).toBeInTheDocument();
  });

  it("shows power icon on colour card", () => {
    render(<LightTile entity={HS_ON} />);
    expect(
      screen.getByRole("button", { name: "Turn off" }),
    ).toBeInTheDocument();
  });

  // ── Toggle ─────────────────────────────────────────────────────────

  it("power icon (on) calls turn_off", () => {
    render(<LightTile entity={DIM_ON} />);
    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));
    expect(callService).toHaveBeenCalledWith("light", "turn_off", {
      entity_id: "light.test",
    });
  });

  it("power icon (off) calls turn_on", () => {
    render(<LightTile entity={DIM_OFF} />);
    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));
    expect(callService).toHaveBeenCalledWith("light", "turn_on", {
      entity_id: "light.test",
    });
  });

  it("tapping an onoff card body (no drag) toggles it", () => {
    const { container } = render(<LightTile entity={ONOFF_OFF} />);
    const card = container.querySelector("div.rounded-2xl");
    // A tap = pointerdown + pointerup at the same position (no movement)
    fireEvent.pointerDown(card, { clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(card, { clientY: 100, pointerId: 1 });
    expect(callService).toHaveBeenCalledWith("light", "turn_on", {
      entity_id: "light.test",
    });
  });

  it("tapping a dimmable card body is a no-op (power icon toggles instead)", () => {
    const { container } = render(<LightTile entity={DIM_ON} />);
    const card = container.querySelector("div.rounded-2xl");
    fireEvent.pointerDown(card, { clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(card, { clientY: 100, pointerId: 1 });
    expect(callService).not.toHaveBeenCalled();
  });

  // ── Colour circle visibility ───────────────────────────────────────

  it("colour circle visible for color_temp light when on", () => {
    render(<LightTile entity={TEMP_ON} />);
    expect(
      screen.getByRole("button", { name: "Colour settings" }),
    ).toBeInTheDocument();
  });

  it("colour circle visible for hs light when on", () => {
    render(<LightTile entity={HS_ON} />);
    expect(
      screen.getByRole("button", { name: "Colour settings" }),
    ).toBeInTheDocument();
  });

  it("colour circle visible for combo light when on", () => {
    render(<LightTile entity={COMBO_ON} />);
    expect(
      screen.getByRole("button", { name: "Colour settings" }),
    ).toBeInTheDocument();
  });

  it("colour circle hidden for brightness-only light", () => {
    render(<LightTile entity={DIM_ON} />);
    expect(
      screen.queryByRole("button", { name: "Colour settings" }),
    ).not.toBeInTheDocument();
  });

  it("colour circle hidden when light is off", () => {
    render(<LightTile entity={HS_OFF} />);
    expect(
      screen.queryByRole("button", { name: "Colour settings" }),
    ).not.toBeInTheDocument();
  });

  it("colour circle hidden for onoff light", () => {
    render(<LightTile entity={ONOFF_ON} />);
    expect(
      screen.queryByRole("button", { name: "Colour settings" }),
    ).not.toBeInTheDocument();
  });

  // ── Bottom sheet: open and contents ───────────────────────────────

  it("clicking colour circle opens the bottom sheet", () => {
    render(<LightTile entity={TEMP_ON} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    // Sheet is open when its specific controls are in the DOM
    expect(
      screen.getByRole("slider", { name: "Color temperature" }),
    ).toBeInTheDocument();
  });

  it("sheet shows temperature slider for color_temp mode with correct range", () => {
    render(<LightTile entity={TEMP_ON} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    const slider = screen.getByRole("slider", { name: "Color temperature" });
    expect(slider).toHaveAttribute("min", "2000");
    expect(slider).toHaveAttribute("max", "6500");
  });

  it("sheet shows temperature slider for combo mode", () => {
    render(<LightTile entity={COMBO_ON} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    expect(
      screen.getByRole("slider", { name: "Color temperature" }),
    ).toBeInTheDocument();
  });

  it("sheet has no temperature slider for hs-only mode", () => {
    render(<LightTile entity={HS_ON} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    expect(
      screen.queryByRole("slider", { name: "Color temperature" }),
    ).not.toBeInTheDocument();
  });

  it("sheet shows swatch group for hs mode", () => {
    render(<LightTile entity={HS_ON} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    expect(
      screen.getByRole("group", { name: "Colour presets" }),
    ).toBeInTheDocument();
  });

  it("sheet shows swatch group for combo mode", () => {
    render(<LightTile entity={COMBO_ON} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    expect(
      screen.getByRole("group", { name: "Colour presets" }),
    ).toBeInTheDocument();
  });

  it("sheet has no swatch group for color_temp-only mode", () => {
    render(<LightTile entity={TEMP_ON} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    expect(
      screen.queryByRole("group", { name: "Colour presets" }),
    ).not.toBeInTheDocument();
  });

  // ── Service calls from sheet ───────────────────────────────────────

  it("temperature slider change calls setColorTemp", () => {
    render(<LightTile entity={TEMP_ON} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    fireEvent.change(
      screen.getByRole("slider", { name: "Color temperature" }),
      {
        target: { value: "4500" },
      },
    );
    expect(callService).toHaveBeenCalledWith("light", "turn_on", {
      entity_id: "light.test",
      color_temp_kelvin: 4500,
    });
  });

  it("Blue swatch tap sends hs_color", () => {
    render(<LightTile entity={HS_ON} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Blue" }));
    expect(callService).toHaveBeenCalledWith("light", "turn_on", {
      entity_id: "light.test",
      hs_color: [240, 100],
    });
  });

  it("Warm White tap on combo mode sends color_temp_kelvin", () => {
    render(<LightTile entity={COMBO_ON} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Warm White" }));
    expect(callService).toHaveBeenCalledWith("light", "turn_on", {
      entity_id: "light.test",
      color_temp_kelvin: 2700,
    });
  });

  it("Warm White tap on hs-only mode sends hs_color fallback", () => {
    render(<LightTile entity={HS_ON} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Warm White" }));
    expect(callService).toHaveBeenCalledWith("light", "turn_on", {
      entity_id: "light.test",
      hs_color: [38, 40],
    });
  });

  // ── Custom colour picker ───────────────────────────────────────────

  it("Custom button reveals hue and saturation sliders", () => {
    render(<LightTile entity={HS_ON} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Custom colour" }));
    expect(screen.getByRole("slider", { name: "Hue" })).toBeInTheDocument();
    expect(
      screen.getByRole("slider", { name: "Saturation" }),
    ).toBeInTheDocument();
  });

  it("hue slider pointerup calls applyCustom with hs_color", () => {
    render(<LightTile entity={HS_ON} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Custom colour" }));
    // HS_ON initial draftHue=240, draftSat=100 — pointerUp without changing fires applyCustom
    fireEvent.pointerUp(screen.getByRole("slider", { name: "Hue" }));
    expect(callService).toHaveBeenCalledWith("light", "turn_on", {
      entity_id: "light.test",
      hs_color: [240, 100],
    });
  });

  it("saturation slider pointerup calls applyCustom with hs_color", () => {
    render(<LightTile entity={HS_ON} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Custom colour" }));
    fireEvent.pointerUp(screen.getByRole("slider", { name: "Saturation" }));
    expect(callService).toHaveBeenCalledWith("light", "turn_on", {
      entity_id: "light.test",
      hs_color: [240, 100],
    });
  });

  // ── Favourites ─────────────────────────────────────────────────────

  it("favourite swatches render and appear before preset swatches", () => {
    const favs = [{ name: "My Scene", type: "hs", value: [90, 80] }];
    render(<LightTile entity={HS_ON} favourites={favs} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    expect(
      screen.getByRole("button", { name: "My Scene" }),
    ).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    const favIdx = buttons.findIndex(
      (b) => b.getAttribute("aria-label") === "My Scene",
    );
    const wwIdx = buttons.findIndex(
      (b) => b.getAttribute("aria-label") === "Warm White",
    );
    expect(favIdx).toBeGreaterThanOrEqual(0);
    expect(favIdx).toBeLessThan(wwIdx);
  });

  // ── Save / remove favourites ───────────────────────────────────────

  it("Save to favourites button appears in custom picker when onAddFavourite is provided", () => {
    render(<LightTile entity={HS_ON} onAddFavourite={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Custom colour" }));
    expect(
      screen.getByRole("button", { name: "Save colour to favourites" }),
    ).toBeInTheDocument();
  });

  it("Save to favourites button is absent when onAddFavourite is not provided", () => {
    render(<LightTile entity={HS_ON} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Custom colour" }));
    expect(
      screen.queryByRole("button", { name: "Save colour to favourites" }),
    ).not.toBeInTheDocument();
  });

  it("clicking Save to favourites opens inline name input", () => {
    const onAdd = vi.fn();
    render(<LightTile entity={HS_ON} onAddFavourite={onAdd} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Custom colour" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Save colour to favourites" }),
    );
    expect(
      screen.getByRole("textbox", { name: "Colour name" }),
    ).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("confirming name input calls onAddFavourite with hs type and current draft values", () => {
    const onAdd = vi.fn();
    render(<LightTile entity={HS_ON} onAddFavourite={onAdd} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Custom colour" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Save colour to favourites" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm save" }));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hs", value: expect.any(Array) }),
    );
  });

  it("favourite swatches show a remove button when onRemoveFavourite is provided", () => {
    const fav = { name: "My Purple", type: "hs", value: [280, 90] };
    render(
      <LightTile
        entity={HS_ON}
        favourites={[fav]}
        onRemoveFavourite={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    expect(
      screen.getByRole("button", { name: "Remove My Purple" }),
    ).toBeInTheDocument();
  });

  it("remove button on a favourite swatch calls onRemoveFavourite with the swatch name", () => {
    const fav = { name: "My Purple", type: "hs", value: [280, 90] };
    const onRemove = vi.fn();
    render(
      <LightTile
        entity={HS_ON}
        favourites={[fav]}
        onRemoveFavourite={onRemove}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove My Purple" }));
    expect(onRemove).toHaveBeenCalledWith("My Purple");
  });

  it("preset swatches have no remove button", () => {
    render(<LightTile entity={HS_ON} onRemoveFavourite={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Colour settings" }));
    // Warm White is a preset, should never get a remove button
    expect(
      screen.queryByRole("button", { name: "Remove Warm White" }),
    ).not.toBeInTheDocument();
  });
});
