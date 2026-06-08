import { useState, useRef, useEffect } from "react";
import { callService } from "../../lib/callService.js";

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

function resolveMode(modes, brightnessPct) {
  const m = modes ?? [];
  const hasHs =
    m.includes("hs") ||
    m.includes("rgb") ||
    m.includes("rgbw") ||
    m.includes("rgbww") ||
    m.includes("xy");
  const hasTemp = m.includes("color_temp");
  if (hasHs && hasTemp) return "combo";
  if (hasHs) return "hs";
  if (hasTemp) return "color_temp";
  if (m.includes("brightness")) return "brightness";
  if (m.length === 0 && brightnessPct !== null) return "brightness";
  return "onoff";
}

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

function cardGlow(isOn, pct) {
  if (!isOn) return "#1a1a1a";
  const a = (((pct ?? 50) / 100) * 0.55).toFixed(2);
  return `radial-gradient(ellipse 180% 150% at 50% 115%, rgba(255,185,75,${a}) 0%, #1a1a1a 60%)`;
}

function resolveColour(hsColor, colorTempKelvin) {
  if (hsColor) return `hsl(${hsColor[0]},${hsColor[1]}%,55%)`;
  if (colorTempKelvin) {
    const t = Math.max(0, Math.min(1, (colorTempKelvin - 2000) / 4500));
    const r = Math.round(255 + (204 - 255) * t);
    const g = Math.round(140 + (224 - 140) * t);
    const b = Math.round(58 + (255 - 58) * t);
    return `rgb(${r},${g},${b})`;
  }
  return "#fff8e7";
}

// 24px track — hue and saturation sliders.
const colourSlider =
  "w-full h-6 rounded-full cursor-pointer appearance-none " +
  "[&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:h-6 " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 " +
  "[&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full " +
  "[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md " +
  "[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:-mt-0.5 " +
  "[&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 " +
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white " +
  "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md";

// 32px track — colour temperature strip.
const tempSlider =
  "w-full h-8 rounded-full cursor-pointer appearance-none " +
  "[&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:h-8 " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 " +
  "[&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full " +
  "[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg " +
  "[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:mt-0.5 " +
  "[&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 " +
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white " +
  "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg";

export default function LightTile({
  entity,
  favourites = [],
  onAddFavourite = null,
  onRemoveFavourite = null,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetReady, setSheetReady] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [draftBrightness, setDraftBrightness] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [draftHue, setDraftHue] = useState(
    () => entity.attributes.hsColor?.[0] ?? 0,
  );
  const [draftSat, setDraftSat] = useState(
    () => entity.attributes.hsColor?.[1] ?? 100,
  );

  const dragRef = useRef(null);
  const sheetPanelRef = useRef(null);
  const handleDragRef = useRef(null);

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
  const hasColour = mode === "hs" || mode === "color_temp" || mode === "combo";
  const dimmable = mode !== "onoff";
  const displayBrightness = draftBrightness ?? brightnessPct;
  const currentColour = resolveColour(hsColor, colorTempKelvin);

  const favSwatches = favourites.map((f) => ({
    label: f.name,
    bg:
      f.type === "color_temp"
        ? `hsl(${Math.round(38 - ((f.value - 2000) / 4500) * 20)},${Math.round(
            80 - ((f.value - 2000) / 4500) * 50,
          )}%,${Math.round(82 - ((f.value - 2000) / 4500) * 20)}%)`
        : `hsl(${f.value[0]},${f.value[1]}%,50%)`,
    colorTemp: f.type === "color_temp" ? f.value : undefined,
    hs: f.type === "hs" ? f.value : undefined,
    isFavourite: true,
  }));

  useEffect(() => {
    if (sheetOpen) {
      const id = setTimeout(() => setSheetReady(true), 10);
      return () => clearTimeout(id);
    } else {
      setSheetReady(false);
    }
  }, [sheetOpen]);

  function toggle() {
    callService("light", isOn ? "turn_off" : "turn_on", {
      entity_id: entity.id,
    });
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 350);
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

  function openSheet() {
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetReady(false);
    setTimeout(() => {
      setSheetOpen(false);
      setCustomOpen(false);
    }, 300);
  }

  function handleCardPointerDown(e) {
    if (e.target.closest("button, input")) return;
    dragRef.current = {
      y: e.clientY,
      pct: brightnessPct ?? 50,
      height: e.currentTarget.getBoundingClientRect().height || 1,
      moved: false,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function handleCardPointerMove(e) {
    if (!dragRef.current || !dimmable) return;
    const deltaY = dragRef.current.y - e.clientY;
    if (Math.abs(deltaY) > 6) {
      if (!dragRef.current.moved) {
        dragRef.current.moved = true;
        setIsDragging(true);
      }
    }
    if (!dragRef.current.moved) return;
    const deltaPct = (deltaY / dragRef.current.height) * 130;
    setDraftBrightness(
      Math.round(Math.max(1, Math.min(100, dragRef.current.pct + deltaPct))),
    );
  }

  function handleCardPointerUp() {
    if (!dragRef.current) return;
    const { moved } = dragRef.current;
    const draft = draftBrightness;
    dragRef.current = null;
    setIsDragging(false);
    setDraftBrightness(null);
    if (!moved) {
      if (!dimmable) toggle();
      return;
    }
    if (draft !== null && isOn) setBrightness(draft);
  }

  function handleHandlePointerDown(e) {
    handleDragRef.current = { y: e.clientY };
    if (sheetPanelRef.current) sheetPanelRef.current.style.transition = "none";
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function handleHandlePointerMove(e) {
    if (!handleDragRef.current) return;
    const delta = Math.max(0, e.clientY - handleDragRef.current.y);
    if (sheetPanelRef.current)
      sheetPanelRef.current.style.transform = `translateY(${delta}px)`;
  }

  function handleHandlePointerUp(e) {
    if (!handleDragRef.current) return;
    const delta = e.clientY - handleDragRef.current.y;
    handleDragRef.current = null;
    if (sheetPanelRef.current) {
      sheetPanelRef.current.style.transition = "";
      sheetPanelRef.current.style.transform = "";
    }
    if (delta > 80) closeSheet();
  }

  const colourCardStyle = {
    background: cardGlow(isOn, displayBrightness),
    transition: isDragging ? "none" : "background 200ms ease",
    ...(isPulsing ? { animation: "pulse-ring 0.35s ease-out" } : {}),
  };

  const onoffCardStyle = {
    background: isOn
      ? "color-mix(in srgb, var(--color-primary) 20%, transparent)"
      : "#1a1a1a",
    transition: "background 200ms ease",
    ...(isPulsing ? { animation: "pulse-ring 0.35s ease-out" } : {}),
  };

  return (
    <>
      {/* ── Tile card ──────────────────────────────────────────────── */}
      <div
        className={[
          "rounded-2xl border min-h-[160px] flex flex-col touch-none select-none",
          mode === "onoff"
            ? "items-center justify-center gap-2 p-4 cursor-pointer"
            : "p-3 cursor-ns-resize",
          isDragging ? "border-[--color-primary]" : "border-[--color-border]",
        ].join(" ")}
        style={mode === "onoff" ? onoffCardStyle : colourCardStyle}
        onPointerDown={handleCardPointerDown}
        onPointerMove={handleCardPointerMove}
        onPointerUp={handleCardPointerUp}
        onPointerCancel={handleCardPointerUp}
      >
        {mode === "onoff" ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggle();
              }}
              aria-label={isOn ? "Turn off" : "Turn on"}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`w-8 h-8 transition-colors ${isOn ? "text-white" : "text-white/25"}`}
              >
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                <line x1="12" y1="2" x2="12" y2="12" />
              </svg>
            </button>
            <span className="font-display text-xs tracking-widest uppercase text-white/50 text-center leading-tight">
              {entity.name}
            </span>
            <span className="font-sans text-[11px] text-white/30 tabular-nums">
              {isOn ? "ON" : "OFF"}
            </span>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-1">
              <span className="font-display text-base font-semibold uppercase tracking-wider text-white leading-tight">
                {entity.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggle();
                }}
                aria-label={isOn ? "Turn off" : "Turn on"}
                className="shrink-0 min-h-[44px] min-w-[44px] flex items-start justify-end pt-0.5"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`w-5 h-5 transition-colors ${isOn ? "text-white" : "text-white/25"}`}
                >
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                  <line x1="12" y1="2" x2="12" y2="12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-[16px]" />
            <div className="flex items-end justify-between gap-2">
              {hasColour && isOn ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openSheet();
                  }}
                  aria-label="Colour settings"
                  className="min-h-[44px] min-w-[44px] flex items-end justify-start -mb-1 -ml-1"
                >
                  <span
                    className="w-6 h-6 rounded-full border-[1.5px] border-white/20 shrink-0 block"
                    style={{ background: currentColour }}
                  />
                </button>
              ) : (
                <span />
              )}
              <span className="font-sans text-[12px] text-white/50 tabular-nums">
                {isOn
                  ? displayBrightness !== null
                    ? `ON · ${displayBrightness}%`
                    : "ON"
                  : "OFF"}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Colour bottom sheet ─────────────────────────────────────── */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{
            opacity: sheetReady ? 1 : 0,
            transition: "opacity 200ms ease",
          }}
          onClick={closeSheet}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[8px]" />
          <div
            ref={sheetPanelRef}
            className="relative bg-[#13151f] rounded-t-3xl flex flex-col h-[75svh] max-h-[600px] w-full"
            style={{
              borderTop:
                "2px solid color-mix(in srgb, var(--color-primary) 40%, transparent)",
              transition: "transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: sheetReady ? "translateY(0)" : "translateY(100%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div
              className="flex justify-center pt-4 pb-2 touch-none cursor-grab active:cursor-grabbing shrink-0"
              onPointerDown={handleHandlePointerDown}
              onPointerMove={handleHandlePointerMove}
              onPointerUp={handleHandlePointerUp}
            >
              <div className="w-16 h-1.5 rounded-full bg-white/20" />
            </div>

            {/* Light name */}
            <span className="font-display text-[11px] uppercase tracking-widest text-white/40 px-4 pb-2 shrink-0">
              {entity.name}
            </span>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 pb-10 flex flex-col gap-5">
              {/* Temperature strip */}
              {(mode === "color_temp" || mode === "combo") && (
                <div className="flex flex-col gap-2">
                  <span className="font-display text-[10px] tracking-widest uppercase text-white/30">
                    Temperature
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[10px] text-[#ff8c3a]/70 shrink-0 leading-none">
                      Warm
                    </span>
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
                      className={`${tempSlider} flex-1`}
                    />
                    <span className="font-display text-[10px] text-[#cce0ff]/70 shrink-0 leading-none">
                      Cool
                    </span>
                  </div>
                </div>
              )}

              {/* Colour swatches + custom picker */}
              {(mode === "hs" || mode === "combo") && (
                <div className="flex flex-col gap-3">
                  <span className="font-display text-[10px] tracking-widest uppercase text-white/30">
                    Colour
                  </span>

                  {/* Favourites row */}
                  {favSwatches.length > 0 && (
                    <div className="flex gap-3 flex-wrap">
                      {favSwatches.map((swatch) => {
                        const active = isSwatchActive(
                          swatch,
                          hsColor,
                          colorTempKelvin,
                          mode,
                        );
                        return (
                          <div key={swatch.label} className="relative">
                            <button
                              onClick={() => tapSwatch(swatch)}
                              aria-label={swatch.label}
                              aria-pressed={active}
                              className={[
                                "w-14 h-14 rounded-full block",
                                active
                                  ? "ring-2 ring-[--color-primary] ring-offset-2 ring-offset-[#13151f]"
                                  : "",
                              ].join(" ")}
                              style={{ background: swatch.bg }}
                            />
                            {onRemoveFavourite && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveFavourite(swatch.label);
                                }}
                                aria-label={`Remove ${swatch.label}`}
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/80 flex items-center justify-center text-white/60 text-[9px] leading-none active:text-white"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 3×3 preset grid */}
                  <div
                    className="grid grid-cols-3 gap-3"
                    role="group"
                    aria-label="Colour presets"
                  >
                    {PRESETS.map((swatch) => {
                      const active = isSwatchActive(
                        swatch,
                        hsColor,
                        colorTempKelvin,
                        mode,
                      );
                      return (
                        <div
                          key={swatch.label}
                          className="flex items-center justify-center"
                        >
                          <button
                            onClick={() => tapSwatch(swatch)}
                            aria-label={swatch.label}
                            aria-pressed={active}
                            className={[
                              "w-14 h-14 rounded-full block",
                              active
                                ? "ring-2 ring-[--color-primary] ring-offset-2 ring-offset-[#13151f]"
                                : "",
                            ].join(" ")}
                            style={{ background: swatch.bg }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Custom button */}
                  <button
                    onClick={() => setCustomOpen((v) => !v)}
                    aria-label={
                      customOpen ? "Close custom colour" : "Custom colour"
                    }
                    className="self-start min-h-[48px] flex items-center font-display text-[10px] tracking-widest uppercase text-white/30 active:text-white/60"
                  >
                    {customOpen ? "✕ Close" : "+ Custom"}
                  </button>

                  {/* Custom hue + saturation picker */}
                  {customOpen && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-12 h-12 rounded-full shrink-0 border border-white/10 block"
                          style={{
                            background: `hsl(${draftHue},${draftSat}%,50%)`,
                          }}
                          aria-hidden="true"
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-display text-[11px] text-white/40 tabular-nums">
                            H {Math.round(draftHue)}°
                          </span>
                          <span className="font-display text-[11px] text-white/40 tabular-nums">
                            S {Math.round(draftSat)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="font-display text-[10px] tracking-widest uppercase text-white/30">
                          Hue
                        </span>
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
                          className={colourSlider}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="font-display text-[10px] tracking-widest uppercase text-white/30">
                          Saturation
                        </span>
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
                          className={colourSlider}
                        />
                      </div>

                      {onAddFavourite && (
                        <button
                          onClick={() =>
                            onAddFavourite({
                              name: `${Math.round(draftHue)}° ${Math.round(draftSat)}%`,
                              type: "hs",
                              value: [draftHue, draftSat],
                            })
                          }
                          aria-label="Save colour to favourites"
                          className="w-full min-h-[48px] flex items-center justify-center gap-2 font-display text-[11px] tracking-widest uppercase text-white/40 active:text-white border border-white/10 rounded-xl"
                        >
                          ★ Save to Favourites
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
