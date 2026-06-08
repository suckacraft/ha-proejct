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
    <div className="grid grid-cols-2 gap-3 p-4">
      {rooms.map((room) => (
        <Link
          key={room.id}
          to={`/rooms/${room.id}`}
          className="bg-surface rounded-xl p-5 border border-[--color-border] flex flex-col gap-2 active:border-primary transition-colors"
        >
          <span className="font-display text-5xl font-bold text-white/20 leading-none tabular-nums">
            {String(room.entityIds.length).padStart(2, "0")}
          </span>
          <span className="font-display text-lg font-semibold tracking-wide uppercase text-white leading-tight">
            {room.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
