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

  const badgeClass =
    hvacMode === "heat"
      ? "bg-orange-500/20 text-orange-400"
      : hvacMode === "cool"
        ? "bg-blue-500/20 text-blue-400"
        : "bg-gray-500/20 text-gray-400";

  return (
    <div className="bg-surface rounded-2xl p-3 border border-[--color-border] flex flex-col gap-3 min-h-[160px]">
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-[11px] uppercase tracking-widest text-white/40 leading-none">
          {entity.name}
        </span>
        <span
          className={`${badgeClass} font-display text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full shrink-0`}
        >
          {hvacMode}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-1">
        {currentTemperature !== null && (
          <>
            <span className="font-display text-[28px] text-white/40 tabular-nums leading-none">
              {currentTemperature}°
            </span>
            <span className="text-white/20 text-lg leading-none">→</span>
          </>
        )}
        <span className="font-display text-[28px] font-bold text-white tabular-nums leading-none">
          {targetTemperature !== null ? `${targetTemperature}°` : "—"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => adjustTemp(-1)}
          aria-label="Decrease temperature"
          className="flex-1 min-h-[44px] flex items-center justify-center rounded-xl bg-white/10 text-white font-display text-2xl font-bold active:bg-white/20"
        >
          −
        </button>
        <button
          onClick={() => adjustTemp(1)}
          aria-label="Increase temperature"
          className="flex-1 min-h-[44px] flex items-center justify-center rounded-xl bg-white/10 text-white font-display text-2xl font-bold active:bg-white/20"
        >
          +
        </button>
      </div>
    </div>
  );
}
