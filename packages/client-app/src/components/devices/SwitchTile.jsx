import { callService } from "../../lib/callService.js";

export default function SwitchTile({ entity }) {
  const isOn = entity.state === "on";

  function toggle() {
    callService("switch", isOn ? "turn_off" : "turn_on", {
      entity_id: entity.id,
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
      <span className="font-sans text-xs text-white/40 uppercase tracking-wider">
        {isOn ? "On" : "Off"}
      </span>
    </div>
  );
}
