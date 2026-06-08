const TABS = ["Rooms", "Scenes", "Cameras", "Settings"];

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="flex bg-surface border-t border-[--color-border] shrink-0">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={[
            "flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px]",
            "font-display text-xs font-semibold tracking-widest uppercase transition-colors",
            activeTab === tab
              ? "text-primary"
              : "text-white/40 active:text-white/70",
          ].join(" ")}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}
