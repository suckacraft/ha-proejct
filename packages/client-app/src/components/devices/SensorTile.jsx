export default function SensorTile({ entity }) {
  const { unit } = entity.attributes;

  return (
    <div className="bg-surface rounded-2xl p-3 border border-[--color-border] flex flex-col justify-between min-h-[160px]">
      <span className="font-display text-[11px] uppercase tracking-widest text-white/40 leading-none">
        {entity.name}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="font-display text-[32px] font-bold text-white leading-none tabular-nums">
          {entity.state}
        </span>
        {unit && (
          <span className="font-sans text-[14px] text-white/40 leading-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
