import { Link } from "react-router-dom";

export default function RoomList({ rooms = [] }) {
  if (!rooms.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-display text-lg tracking-widest uppercase text-white/30">
          No rooms configured
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
      {rooms.map((room) => (
        <Link
          key={room.id}
          to={`/rooms/${room.id}`}
          className="bg-surface rounded-xl p-5 border border-[--color-border] min-h-[160px] flex flex-col justify-between active:bg-[--color-raised] active:border-[--color-primary]/40 active:scale-[0.97] transition-all duration-100"
        >
          <span className="font-display text-6xl font-black text-white/15 leading-none tabular-nums">
            {String(room.entityIds.length).padStart(2, "0")}
          </span>
          <span className="font-display text-[15px] font-bold tracking-wide uppercase text-white leading-tight">
            {room.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
