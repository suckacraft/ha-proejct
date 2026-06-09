import { useState } from "react";
import { callService } from "../../lib/callService.js";

function SceneIcon({ name, flashing }) {
  const colour = flashing ? "text-white" : "text-white/60";
  const cls = `w-7 h-7 ${colour}`;

  switch (name) {
    case "sunrise":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M12 2v2M4.93 4.93l1.41 1.41M2 12h2M20 12h2M18.66 4.93l-1.41 1.41" />
          <path d="M5 17a7 7 0 0 1 14 0" />
          <line x1="3" y1="20" x2="21" y2="20" />
        </svg>
      );
    case "home-off":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M2 2l20 20" />
          <path d="M8.56 2.9A7 7 0 0 1 19 9v4" />
          <path d="M10.7 8.7A5 5 0 0 1 17 14v4H7V14" />
          <path d="M3 3v1a5 5 0 0 0 5 5" />
        </svg>
      );
    case "sunset":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M12 10v4M4.93 10.93l1.41 1.41M2 18h2M20 18h2M18.66 10.93l-1.41 1.41" />
          <path d="M5 23a7 7 0 0 1 14 0" />
          <line x1="3" y1="20" x2="21" y2="20" />
          <path d="M12 6V2" />
          <path d="m15 3-3 3-3-3" />
        </svg>
      );
    case "film":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
          <line x1="7" y1="2" x2="7" y2="22" />
          <line x1="17" y1="2" x2="17" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="2" y1="7" x2="7" y2="7" />
          <line x1="2" y1="17" x2="7" y2="17" />
          <line x1="17" y1="17" x2="22" y2="17" />
          <line x1="17" y1="7" x2="22" y2="7" />
        </svg>
      );
    case "moon":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
  }
}

export default function SceneTile({ scene }) {
  const [flashing, setFlashing] = useState(false);

  function activate() {
    setFlashing(true);
    callService("scene", "turn_on", { entity_id: scene.sceneId }).catch(console.error);
    setTimeout(() => setFlashing(false), 1500);
  }

  return (
    <button
      onClick={activate}
      aria-label={`Activate ${scene.name} scene`}
      className={[
        "rounded-2xl border min-h-[160px] w-full flex flex-col items-center justify-center gap-3 p-4",
        "transition-colors duration-150 touch-none select-none",
        flashing
          ? "bg-[--color-primary] border-[--color-primary]"
          : "bg-surface border-[--color-border] active:border-[--color-primary]",
      ].join(" ")}
    >
      <SceneIcon name={scene.icon} flashing={flashing} />
      <span className="font-display text-xs tracking-widest uppercase text-center leading-tight text-white/80">
        {scene.name}
      </span>
    </button>
  );
}
