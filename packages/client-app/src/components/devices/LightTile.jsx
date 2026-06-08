import { useState } from "react";
import { callService } from "../../lib/callService.js";

// Preset colour swatches. Whites carry colorTemp for lights that support it;
// all swatches carry hs as the fallback for hs-only lights.
const PRESETS = [
  { label: "Warm White", bg: "hsl(38,80%,82%)", colorTemp: 2700, hs: [38, 40] },
  {
    label: "Cool White",
    bg: "hsl(210,30%,88%)",
    colorTemp: 5000,
    hs: [210, 15],
  },
  { label: "Red", bg: "hsl(0,100%,50%)", hs: [0, 100] },
  { label: "Orange", bg: "hsl(30,100%,50%)", hs: [30, 100] },
  { label: "Yellow", bg: "hsl(60,100%,50%)", hs: [60, 100] },
  { label: "Green", bg: "hsl(120,80%,40%)", hs: [120, 100] },
  { label: "Blue", bg: "hsl(240,100%,60%)", hs: [240, 100] },
  { label: "Purple", bg: "hsl(280,100%,60%)", hs: [280, 100] },
  { label: "Pink", bg: "hsl(330,100%,65%)", hs: [330, 100] },
];

// Derive a single mode string from the supportedColorModes array.
// "combo" = both color_temp and hs/rgb supported.
// Edge case: empty/absent modes with a non-null brightnessPct means the
// device under-reports its capabilities — treat as brightness-capable.
function resolveMode(modes, brightnessPct) {
  const m = modes ?? [];
  const hasHs = m.includes("hs") || m.includes("rgb");
  const hasTemp = m.includes("color_temp");
  if (hasHs && hasTemp) return "combo";
  if (hasHs) return "hs";
  if (hasTemp) return "color_temp";
  if (m.includes("brightness")) return "brightness";
  // Under-reporting device: fall back to brightness if brightnessPct is present
  if (m.length === 0 && brightnessPct !== null) return "brightness";
  return "onoff";
}

// Returns true when swatch matches the light's current colour state.
function isSwatchActive(swatch, hsColor, colorTempKelvin, mode) {
  if (swatch.colorTemp && mode !== "hs" && colorTempKelvin != null) {
    return Math.abs(colorTempKelvin - swatch.colorTemp) <= 100;
  }
  if (hsColor) {
    return (
      Math.abs(hsColor[0] - swatch.hs[0]) <= 5 &&
      Math.abs(hsColor[1] - swatch.hs[1]) <= 5
    );
  }
  return false;
}

export default function LightTile({ entity, favourites = [] }) {
  const [colourOpen, setColourOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [draftHue, setDraftHue] = useState(
    () => entity.attributes.hsColor?.[0] ?? 0,
  );
  const [draftSat, setDraftSat] = useState(
    () => entity.attributes.hsColor?.[1] ?? 100,
  );

  const isOn = entity.state === "on";
  const {
    brightnessPct,
    colorTempKelvin,
    minColorTempKelvin,
    maxColorTempKelvin,
    hsColor,
    supportedColorModes,
  } = entity.attributes;

  const mode = resolveMode(supportedColorModes, brightnessPct);
  const minTemp = minColorTempKelvin ?? 2000;
  const maxTemp = maxColorTempKelvin ?? 6500;

  const showBrightness = mode !== "onoff" && isOn && brightnessPct !== null;
  const showColorTemp = (mode === "color_temp" || mode === "combo") && isOn;
  const showSwatches =
    isOn && (mode === "hs" || (mode === "combo" && colourOpen));

  // All swatches: favourites first, then presets.
  const allSwatches = [
    ...favourites.map((f) => ({
      label: f.name,
      bg:
        f.type === "color_temp"
          ? `hsl(${Math.round(38 - ((f.value - 2000) / 4500) * 20)},${Math.round(80 - ((f.value - 2000) / 4500) * 50)}%,${Math.round(82 - ((f.value - 2000) / 4500) * 20)}%)`
          : `hsl(${f.value[0]},${f.value[1]}%,50%)`,
      colorTemp: f.type === "color_temp" ? f.value : undefined,
      hs: f.type === "hs" ? f.value : undefined,
      isFavourite: true,
    })),
    ...PRESETS,
  ];

  function toggle() {
    callService("light", isOn ? "turn_off" : "turn_on", {
      entity_id: entity.id,
    });
  }

  function setBrightness(pct) {
    callService("light", "turn_on", {
      entity_id: entity.id,
      brightness_pct: pct,
    });
  }

  function setColorTemp(kelvin) {
    callService("light", "turn_on", {
      entity_id: entity.id,
      color_temp_kelvin: kelvin,
    });
  }

  function tapSwatch(swatch) {
    // Use color_temp for whites on lights that support it;
    // fall back to hs_color for hs-only lights.
    if (swatch.colorTemp && mode !== "hs") {
      callService("light", "turn_on", {
        entity_id: entity.id,
        color_temp_kelvin: swatch.colorTemp,
      });
    } else {
      callService("light", "turn_on", {
        entity_id: entity.id,
        hs_color: swatch.hs,
      });
    }
  }

  function applyCustom() {
    callService("light", "turn_on", {
      entity_id: entity.id,
      hs_color: [draftHue, draftSat],
    });
  }

  return (
    <div className="bg-surface rounded-xl p-4 border border-[--color-border] flex flex-col gap-3">
      {/* ── Name + toggle ─────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-base font-semibold tracking-wide uppercase text-white leading-tight">
          {entity.name}
        </span>
        <button
          onClick={toggle}
          aria-label={isOn ? "Turn off" : "Turn on"}
          className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <div
            className={[
              "relative w-11 h-6 rounded-full transition-colors",
              isOn ? "bg-primary" : "bg-white/20",
            ].join(" ")}
          >
            <span
              className={[
                "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
                isOn ? "right-1" : "left-1",
              ].join(" ")}
            />
          </div>
        </button>
      </div>

      {/* ── Brightness slider ─────────────────────────────── */}
      {showBrightness && (
        <input
          type="range"
          min={1}
          max={100}
          value={brightnessPct}
          onChange={(e) => setBrightness(Number(e.target.value))}
          aria-label="Brightness"
          className="w-full accent-primary h-1 cursor-pointer"
        />
      )}

      {/* ── Colour temperature slider ─────────────────────── */}
      {showColorTemp && (
        <input
          type="range"
          min={minTemp}
          max={maxTemp}
          value={colorTempKelvin ?? minTemp}
          onChange={(e) => setColorTemp(Number(e.target.value))}
          aria-label="Color temperature"
          style={{
            background:
              "linear-gradient(to right, #ff8c3a 0%, #fffaf0 50%, #cce0ff 100%)",
          }}
          className="w-full h-2 rounded-full cursor-pointer"
        />
      )}

      {/* ── Combo: colour expand button ───────────────────── */}
      {mode === "combo" && isOn && (
        <button
          onClick={() => setColourOpen((v) => !v)}
          aria-label={colourOpen ? "Hide colour picker" : "Show colour picker"}
          className="flex items-center gap-1 min-h-[44px] font-display text-xs tracking-widest uppercase text-white/40 active:text-white/70"
        >
          <span aria-hidden="true">{colourOpen ? "▲" : "▼"}</span>
          <span>Colour</span>
        </button>
      )}

      {/* ── Colour swatches ───────────────────────────────── */}
      {showSwatches && (
        <>
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            role="group"
            aria-label="Colour presets"
          >
            {allSwatches.map((swatch) => {
              const active = isSwatchActive(
                swatch,
                hsColor,
                colorTempKelvin,
                mode,
              );
              return (
                <button
                  key={swatch.label}
                  onClick={() => tapSwatch(swatch)}
                  aria-label={swatch.label}
                  aria-pressed={active}
                  className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <span
                    className={[
                      "w-9 h-9 rounded-full block",
                      active
                        ? "ring-2 ring-white ring-offset-2 ring-offset-[#161920]"
                        : "",
                    ].join(" ")}
                    style={{ background: swatch.bg }}
                  />
                </button>
              );
            })}

            {/* Custom colour button */}
            <button
              onClick={() => setCustomOpen((v) => !v)}
              aria-label={customOpen ? "Close custom colour" : "Custom colour"}
              className="shrink-0 min-h-[44px] px-2 flex items-center justify-center font-display text-xs tracking-widest uppercase text-white/40 active:text-white/70"
            >
              {customOpen ? "✕" : "Custom"}
            </button>
          </div>

          {/* Custom hue + saturation picker */}
          {customOpen && (
            <div className="flex flex-col gap-3">
              {/* Colour preview */}
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="w-9 h-9 rounded-full shrink-0 border border-white/10"
                  style={{
                    background: `hsl(${draftHue},${draftSat}%,50%)`,
                  }}
                />
                <span className="font-sans text-xs text-white/40 tabular-nums">
                  {Math.round(draftHue)}° / {Math.round(draftSat)}%
                </span>
              </div>

              {/* Hue */}
              <input
                type="range"
                min={0}
                max={360}
                value={draftHue}
                onChange={(e) => setDraftHue(Number(e.target.value))}
                onPointerUp={applyCustom}
                aria-label="Hue"
                style={{
                  background:
                    "linear-gradient(to right,hsl(0,100%,50%),hsl(30,100%,50%),hsl(60,100%,50%),hsl(120,100%,50%),hsl(180,100%,50%),hsl(240,100%,50%),hsl(300,100%,50%),hsl(360,100%,50%))",
                }}
                className="w-full h-2 rounded-full cursor-pointer"
              />

              {/* Saturation */}
              <input
                type="range"
                min={0}
                max={100}
                value={draftSat}
                onChange={(e) => setDraftSat(Number(e.target.value))}
                onPointerUp={applyCustom}
                aria-label="Saturation"
                style={{
                  background: `linear-gradient(to right,hsl(${draftHue},0%,50%),hsl(${draftHue},100%,50%))`,
                }}
                className="w-full h-2 rounded-full cursor-pointer"
              />
            </div>
          )}
        </>
      )}

      {/* ── Status text ───────────────────────────────────── */}
      <span className="font-sans text-xs text-white/40 uppercase tracking-wider">
        {isOn ? (brightnessPct !== null ? `${brightnessPct}%` : "On") : "Off"}
      </span>
    </div>
  );
}
