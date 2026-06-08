export default function FallbackTile({ entity }) {
  return (
    <div className="bg-surface rounded-xl p-4 border border-[--color-border] flex flex-col gap-2">
      <span className="font-display text-base font-semibold tracking-wide uppercase text-white leading-tight">
        {entity.name}
      </span>
      <span className="font-sans text-sm capitalize text-white/40">
        {entity.state}
      </span>
    </div>
  );
}
