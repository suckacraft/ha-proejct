export default function SensorTile({ entity }) {
  const { unit } = entity.attributes;

  return (
    <div className="bg-surface rounded-xl p-4 border border-[--color-border] flex flex-col gap-2">
      <span className="font-display text-base font-semibold tracking-wide uppercase text-white leading-tight">
        {entity.name}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="font-display text-3xl font-bold text-white leading-none tabular-nums">
          {entity.state}
        </span>
        {unit && (
          <span className="font-display text-lg font-normal text-white/60">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
