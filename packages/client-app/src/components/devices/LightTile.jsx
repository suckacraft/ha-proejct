import { callService } from "../../lib/callService.js";

export default function LightTile({ entity }) {
  const isOn = entity.state === "on";
  const { brightnessPct } = entity.attributes;

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

  return (
    <div className="bg-surface rounded-xl p-4 border border-[--color-border] flex flex-col gap-3">
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
      {isOn && brightnessPct !== null && (
        <input
          type="range"
          min={0}
          max={100}
          value={brightnessPct}
          onChange={(e) => setBrightness(Number(e.target.value))}
          className="w-full accent-primary h-1 cursor-pointer"
        />
      )}
      <span className="font-sans text-xs text-white/40 uppercase tracking-wider">
        {isOn ? (brightnessPct !== null ? `${brightnessPct}%` : "On") : "Off"}
      </span>
    </div>
  );
}
