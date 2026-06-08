import { callService } from "../../lib/callService.js";

export default function ClimateTile({ entity }) {
  const { currentTemperature, targetTemperature, targetTempStep } =
    entity.attributes;
  const hvacMode = entity.state;

  function adjustTemp(delta) {
    const step = targetTempStep ?? 1;
    const base = targetTemperature ?? currentTemperature ?? 20;
    const next = Math.round((base + delta * step) * 10) / 10;
    callService("climate", "set_temperature", {
      entity_id: entity.id,
      temperature: next,
    });
  }

  return (
    <div className="bg-surface rounded-xl p-4 border border-[--color-border] flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-base font-semibold tracking-wide uppercase text-white leading-tight">
          {entity.name}
        </span>
        <span
          className={[
            "font-display text-xs font-semibold tracking-widest uppercase px-2 py-0.5 rounded",
            hvacMode === "heat"
              ? "bg-orange-500/20 text-orange-400"
              : hvacMode === "cool"
                ? "bg-blue-500/20 text-blue-400"
                : hvacMode === "off"
                  ? "bg-white/10 text-white/30"
                  : "bg-white/10 text-white/60",
          ].join(" ")}
        >
          {hvacMode}
        </span>
      </div>
      {currentTemperature !== null && (
        <span className="font-sans text-xs text-white/40">
          Current: {currentTemperature}°
        </span>
      )}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => adjustTemp(-1)}
          aria-label="Decrease temperature"
          className="flex items-center justify-center rounded-lg bg-white/10 text-white font-display text-xl font-bold active:bg-white/20 min-h-[44px] min-w-[44px]"
        >
          −
        </button>
        <span className="font-display text-2xl font-bold text-white tabular-nums">
          {targetTemperature !== null ? `${targetTemperature}°` : "—"}
        </span>
        <button
          onClick={() => adjustTemp(1)}
          aria-label="Increase temperature"
          className="flex items-center justify-center rounded-lg bg-white/10 text-white font-display text-xl font-bold active:bg-white/20 min-h-[44px] min-w-[44px]"
        >
          +
        </button>
      </div>
    </div>
  );
}
