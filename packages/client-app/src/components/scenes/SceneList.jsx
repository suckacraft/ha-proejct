import SceneTile from "./SceneTile.jsx";

export default function SceneList({ scenes = [] }) {
  if (scenes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-display text-lg tracking-widest uppercase text-white/30">
          No scenes
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <h2 className="font-display text-[13px] tracking-widest uppercase text-white/40">
        Scenes
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {scenes.map((scene) => (
          <SceneTile key={scene.id} scene={scene} />
        ))}
      </div>
    </div>
  );
}
