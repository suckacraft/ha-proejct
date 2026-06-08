export default function Header({ clientName, logoUrl }) {
  return (
    <header className="flex items-center gap-3 px-5 h-14 bg-surface border-b border-[--color-border] shrink-0">
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
