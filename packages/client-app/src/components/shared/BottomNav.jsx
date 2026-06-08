import { NavLink } from "react-router-dom";

const TABS = [
  { label: "Rooms", path: "/rooms" },
  { label: "Scenes", path: "/scenes" },
  { label: "Cameras", path: "/cameras" },
  { label: "Settings", path: "/settings" },
];

export default function BottomNav() {
  return (
    <nav className="flex bg-surface border-t border-[--color-border] shrink-0">
      {TABS.map(({ label, path }) => (
        <NavLink
          key={label}
          to={path}
          className={({ isActive }) =>
            [
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px]",
              "font-display text-xs font-semibold tracking-widest uppercase transition-colors",
              isActive ? "text-primary" : "text-white/40 active:text-white/70",
            ].join(" ")
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
