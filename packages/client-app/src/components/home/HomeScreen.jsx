import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useEntityStore } from "../../store/entities.js";
import { usePreferencesStore } from "../../store/preferences.js";
import { callService } from "../../lib/callService.js";
import { useClock } from "../../hooks/useClock.js";

const WEATHER_ICONS = {
  sunny: "☀️",
  "clear-night": "🌙",
  partlycloudy: "⛅",
  cloudy: "☁️",
  rainy: "🌧️",
  pouring: "🌧️",
  snowy: "❄️",
  "snowy-rainy": "🌨️",
  windy: "💨",
  fog: "🌫️",
  hail: "🌨️",
  lightning: "⚡",
  "lightning-rainy": "⛈️",
  exceptional: "⚠️",
};

function getGreeting(now, firstName) {
  const h = now.getHours();
  const name = firstName ?? "there";
  if (h < 12) return `Good morning, ${name}`;
  if (h < 17) return `Good afternoon, ${name}`;
  if (h < 21) return `Good evening, ${name}`;
  return `Good night, ${name}`;
}

function formatTime(now) {
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function HomeScreen({
  rooms = [],
  scenes = [],
  clientName = "",
  firstName,
}) {
  const now = useClock();
  const navigate = useNavigate();
  const entities = useEntityStore((s) => s.entities);
  const homeFavourites = usePreferencesStore((s) => s.homeFavourites);
  const [flashingScene, setFlashingScene] = useState(null);

  const allEntities = useMemo(() => [...entities.values()], [entities]);

  const weatherEntity = useMemo(
    () => allEntities.find((e) => e.domain === "weather"),
    [allEntities],
  );

  const lightsOnCount = useMemo(
    () =>
      allEntities.filter((e) => e.domain === "light" && e.state === "on")
        .length,
    [allEntities],
  );

  const tempSensor = useMemo(
    () =>
      allEntities.find(
        (e) =>
          e.domain === "sensor" &&
          (e.attributes?.unit === "°C" || e.attributes?.unit === "°F"),
      ),
    [allEntities],
  );

  const unlockedCount = useMemo(
    () =>
      allEntities.filter((e) => e.domain === "lock" && e.state === "unlocked")
        .length,
    [allEntities],
  );

  const playingPlayer = useMemo(
    () =>
      allEntities.find(
        (e) => e.domain === "media_player" && e.state === "playing",
      ),
    [allEntities],
  );

  const favouriteRooms = useMemo(() => {
    if (homeFavourites) {
      return homeFavourites
        .map((id) => rooms.find((r) => r.id === id))
        .filter(Boolean);
    }
    return rooms.slice(0, 3);
  }, [homeFavourites, rooms]);

  function handleScene(scene) {
    setFlashingScene(scene.id);
    callService("scene", "turn_on", { entity_id: scene.sceneId }).catch(
      console.error,
    );
    setTimeout(() => setFlashingScene(null), 1500);
  }

  return (
    <div className="p-4 flex flex-col gap-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-1 pt-1">
        <div className="flex items-center justify-between">
          <span className="font-display text-[13px] tracking-widest uppercase text-white/40">
            {clientName}
          </span>
          <span className="font-display text-[13px] tabular-nums text-white/40">
            {formatTime(now)}
          </span>
        </div>
        <p className="font-display text-[22px] font-bold text-white leading-tight">
          {getGreeting(now, firstName)}
        </p>
      </div>

      {/* Weather + Active Summary */}
      {(weatherEntity ||
        lightsOnCount > 0 ||
        tempSensor ||
        unlockedCount > 0) && (
        <div className="flex gap-3">
          {weatherEntity && (
            <div className="shrink-0 bg-surface rounded-2xl p-3 border border-[--color-border] min-w-[130px] flex flex-col gap-1">
              <span className="text-[22px] leading-none">
                {WEATHER_ICONS[weatherEntity.state] ?? "🌤️"}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[24px] font-bold text-white tabular-nums leading-none">
                  {weatherEntity.attributes?.temperature ?? "—"}
                </span>
                <span className="font-sans text-[13px] text-white/40 leading-none">
                  {weatherEntity.attributes?.temperatureUnit ?? "°"}
                </span>
              </div>
              <span className="font-display text-[9px] tracking-widest uppercase text-white/30 leading-none capitalize">
                {weatherEntity.state.replace(/-/g, " ")}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2 flex-1 justify-center">
            {lightsOnCount > 0 && (
              <div className="bg-surface rounded-xl px-3 py-2 border border-[--color-border] flex items-center gap-2">
                <span className="text-sm leading-none">💡</span>
                <span className="font-display text-[10px] tracking-widest uppercase text-white/60">
                  {lightsOnCount} light{lightsOnCount !== 1 ? "s" : ""} on
                </span>
              </div>
            )}
            {tempSensor && (
              <div className="bg-surface rounded-xl px-3 py-2 border border-[--color-border] flex items-center gap-2">
                <span className="text-sm leading-none">🌡️</span>
                <span className="font-display text-[10px] tracking-widest uppercase text-white/60">
                  {tempSensor.state}
                  {tempSensor.attributes?.unit}
                </span>
              </div>
            )}
            {unlockedCount > 0 && (
              <div className="bg-surface rounded-xl px-3 py-2 border border-[--color-border] flex items-center gap-2">
                <span className="text-sm leading-none">🔓</span>
                <span className="font-display text-[10px] tracking-widest uppercase text-white/60">
                  {unlockedCount} unlocked
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Favourite Rooms */}
      {favouriteRooms.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="font-display text-[11px] tracking-widest uppercase text-white/30">
            Favourite Rooms
          </span>
          <div
            className="flex gap-3 overflow-x-auto -mx-4 px-4"
            style={{ scrollbarWidth: "none" }}
          >
            {favouriteRooms.map((room) => {
              const onCount = room.entityIds.filter((id) => {
                const e = entities.get(id);
                return e?.domain === "light" && e.state === "on";
              }).length;
              return (
                <button
                  key={room.id}
                  onClick={() => navigate(`/rooms/${room.id}`)}
                  className="shrink-0 bg-surface rounded-2xl p-3 border border-[--color-border] min-w-[120px] flex flex-col gap-2 text-left active:bg-white/5"
                >
                  <span className="font-display text-[11px] uppercase tracking-widest text-white/40 leading-none">
                    {room.name}
                  </span>
                  <span className="font-display text-[26px] font-bold text-white leading-none tabular-nums">
                    {onCount}
                  </span>
                  <span className="font-display text-[9px] tracking-widest uppercase text-white/30 leading-none">
                    light{onCount !== 1 ? "s" : ""} on
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Scenes */}
      {scenes.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="font-display text-[11px] tracking-widest uppercase text-white/30">
            Scenes
          </span>
          <div className="flex flex-wrap gap-2">
            {scenes.map((scene) => {
              const isFlashing = flashingScene === scene.id;
              return (
                <button
                  key={scene.id}
                  onClick={() => handleScene(scene)}
                  className={[
                    "px-4 py-2.5 rounded-full border font-display text-[10px] tracking-widest uppercase",
                    "transition-colors duration-150",
                    isFlashing
                      ? "bg-[--color-primary] border-[--color-primary] text-white"
                      : "bg-surface border-[--color-border] text-white/60 active:bg-white/10",
                  ].join(" ")}
                >
                  {scene.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Now Playing */}
      {playingPlayer && (
        <div className="flex flex-col gap-3">
          <span className="font-display text-[11px] tracking-widest uppercase text-white/30">
            Now Playing
          </span>
          <div className="bg-surface rounded-2xl p-3 border border-[--color-border] flex items-center gap-3">
            {playingPlayer.attributes?.entityPicture ? (
              <img
                src={playingPlayer.attributes.entityPicture}
                alt=""
                className="w-12 h-12 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-xl">
                ♪
              </div>
            )}
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-display text-[13px] font-bold text-white truncate leading-none">
                {playingPlayer.attributes?.mediaTitle ?? "Playing"}
              </span>
              {playingPlayer.attributes?.mediaArtist && (
                <span className="font-sans text-[11px] text-white/40 truncate">
                  {playingPlayer.attributes.mediaArtist}
                </span>
              )}
              <span className="font-display text-[9px] tracking-widest uppercase text-white/20 mt-1">
                {playingPlayer.name}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
