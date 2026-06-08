import { useParams } from "react-router-dom";
import { useEntityStore } from "../../store/entities.js";
import { TILE_MAP } from "../devices/index.js";
import FallbackTile from "../devices/FallbackTile.jsx";
import SkeletonTile from "../devices/SkeletonTile.jsx";

export default function RoomDetail({ rooms = [] }) {
  const { roomId } = useParams();
  const entities = useEntityStore((s) => s.entities);
  const room = rooms.find((r) => r.id === roomId);

  if (!room) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-display text-lg tracking-widest uppercase text-white/30">
          Room not found
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="font-display text-sm font-semibold tracking-widest uppercase text-white/40 pt-1">
        {room.name}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {room.entityIds.map((entityId) => {
          const entity = entities.get(entityId);
          if (!entity) return <SkeletonTile key={entityId} />;
          const TileComponent = TILE_MAP[entity.domain] ?? FallbackTile;
          return <TileComponent key={entityId} entity={entity} />;
        })}
      </div>
    </div>
  );
}
