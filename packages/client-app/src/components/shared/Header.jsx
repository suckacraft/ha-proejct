export default function Header({ clientName, logoUrl, onBack }) {
  return (
    <header className="md:hidden flex items-center gap-3 px-5 h-14 bg-surface border-b border-[--color-border] shrink-0">
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Go back"
          className="flex items-center justify-center -ml-1 min-h-[44px] min-w-[44px] text-white/60 active:text-white font-display text-xl"
        >
          ←
        </button>
      )}
      {logoUrl && (
        <img
          src={logoUrl}
          alt=""
          className="h-7 w-7 rounded object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
      <span className="font-display text-xl font-semibold tracking-widest uppercase text-white">
        {clientName}
      </span>
    </header>
  );
}
