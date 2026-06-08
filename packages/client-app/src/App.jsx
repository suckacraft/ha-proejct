import { useState, useEffect } from "react";
import { loadConfig } from "./config/index.js";
import { useHA } from "./hooks/useHA.js";
import Header from "./components/shared/Header.jsx";
import BottomNav from "./components/shared/BottomNav.jsx";
import RoomList from "./components/rooms/RoomList.jsx";

export default function App() {
  const [config, setConfig] = useState(null);
  const [activeTab, setActiveTab] = useState("Rooms");
  useHA();

  useEffect(() => {
    loadConfig().then(setConfig);
  }, []);

  if (!config) return null;

  return (
    <div className="flex flex-col h-dvh bg-canvas text-white font-sans overflow-hidden">
      <Header clientName={config.clientName} logoUrl={config.logoUrl} />
      <main className="flex-1 overflow-y-auto">
        {activeTab === "Rooms" && <RoomList rooms={config.rooms} />}
        {activeTab === "Scenes" && (
          <div className="flex items-center justify-center h-full">
            <p className="font-display text-lg tracking-widest uppercase text-white/30">
              Scenes
            </p>
          </div>
        )}
        {activeTab === "Cameras" && (
          <div className="flex items-center justify-center h-full">
            <p className="font-display text-lg tracking-widest uppercase text-white/30">
              Cameras
            </p>
          </div>
        )}
        {activeTab === "Settings" && (
          <div className="flex items-center justify-center h-full">
            <p className="font-display text-lg tracking-widest uppercase text-white/30">
              Settings
            </p>
          </div>
        )}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
