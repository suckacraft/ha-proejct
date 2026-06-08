import { useState } from "react";
import { useParams } from "react-router-dom";
import { useEntityStore } from "../../store/entities.js";
import { usePreferencesStore } from "../../store/preferences.js";
import { callService } from "../../lib/callService.js";
import { TILE_MAP } from "../devices/index.js";
import FallbackTile from "../devices/FallbackTile.jsx";
import SkeletonTile from "../devices/SkeletonTile.jsx";

export default function RoomDetail({ rooms = [] }) {
  const { roomId } = useParams();
  const entities = useEntityStore((s) => s.entities);
  const favourites = usePreferencesStore((s) => s.favourites);
  const roomDefaults = usePreferencesStore((s) => s.roomDefaults);
  const addFavourite = usePreferencesStore((s) => s.addFavourite);
  const removeFavourite = usePreferencesStore((s) => s.removeFavourite);
  const saveRoomDefault = usePreferencesStore((s) => s.saveRoomDefault);
  const clearRoomDefault = usePreferencesStore((s) => s.clearRoomDefault);

  // Local draft for while the slider is being dragged; null = use persisted value.
  const [draftDefault, setDraftDefault] = useState(null);

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

  const persistedDefault = roomDefaults[room.id]?.brightness ?? null;
  const displayDefault = draftDefault ?? persistedDefault;

  function applyDefault() {
    if (displayDefault === null) return;
    room.entityIds.forEach((id) => {
      const entity = entities.get(id);
      if (entity?.domain === "light") {
        callService("light", "turn_on", {
          entity_id: id,
          brightness_pct: displayDefault,
        });
      }
    });
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="font-display text-sm font-semibold tracking-widest uppercase text-white/40 pt-1">
        {room.name}
      </h2>

      {/* Room default brightness */}
      {persistedDefault !== null ? (
        <div className="flex items-center gap-3">
          <span className="font-display text-[9px] tracking-widest uppercase text-white/30 shrink-0 tabular-nums">
            Default · {displayDefault}%
          </span>
          <input
            type="range"
            min={1}
            max={100}
            value={displayDefault}
            onChange={(e) => setDraftDefault(Number(e.target.value))}
            onPointerUp={(e) => {
              const val = Number(e.target.value);
              setDraftDefault(null);
              saveRoomDefault(room.id, val);
            }}
            aria-label="Default brightness"
            className="flex-1 h-1 accent-[--color-primary]"
          />
          <button
            onClick={applyDefault}
            aria-label="Apply room default brightness"
            className="shrink-0 font-display text-[9px] tracking-widest uppercase text-[--color-primary] active:opacity-60"
          >
            Apply
          </button>
          <button
            onClick={() => clearRoomDefault(room.id)}
            aria-label="Clear room default brightness"
            className="shrink-0 font-sans text-[11px] text-white/20 active:text-white/50"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          onClick={() => saveRoomDefault(room.id, 50)}
          aria-label="Set default brightness"
          className="font-display text-[9px] tracking-widest uppercase text-white/20 active:text-white/50"
        >
          + Set default brightness
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        {room.entityIds.map((entityId) => {
          const entity = entities.get(entityId);
          if (!entity) return <SkeletonTile key={entityId} />;
          const TileComponent = TILE_MAP[entity.domain] ?? FallbackTile;
          return (
            <TileComponent
              key={entityId}
              entity={entity}
              {...(entity.domain === "light"
                ? {
                    favourites,
                    onAddFavourite: addFavourite,
                    onRemoveFavourite: removeFavourite,
                  }
                : {})}
            />
          );
        })}
      </div>
    </div>
  );
}
