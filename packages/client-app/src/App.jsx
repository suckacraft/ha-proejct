import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { loadConfig } from "./config/index.js";
import { useHA } from "./hooks/useHA.js";
import { usePreferences } from "./hooks/usePreferences.js";
import Header from "./components/shared/Header.jsx";
import BottomNav from "./components/shared/BottomNav.jsx";
import HomeScreen from "./components/home/HomeScreen.jsx";
import RoomList from "./components/rooms/RoomList.jsx";
import RoomDetail from "./components/rooms/RoomDetail.jsx";
import SceneList from "./components/scenes/SceneList.jsx";

function Placeholder({ label }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="font-display text-lg tracking-widest uppercase text-white/30">
        {label}
      </p>
    </div>
  );
}

function AppContent() {
  const [config, setConfig] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  useHA();
  usePreferences();

  useEffect(() => {
    loadConfig().then(setConfig);
  }, []);

  if (!config) return null;

  const isHome = location.pathname === "/home";
  const isRoomDetail = /^\/rooms\/.+/.test(location.pathname);

  return (
    <div className="flex flex-col h-dvh bg-canvas text-white font-sans overflow-hidden">
      {!isHome && (
        <Header
          clientName={config.clientName}
          logoUrl={config.logoUrl}
          onBack={isRoomDetail ? () => navigate(-1) : undefined}
        />
      )}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route
            path="/home"
            element={
              <HomeScreen
                rooms={config.rooms}
                scenes={config.scenes ?? []}
                clientName={config.clientName}
                firstName={config.firstName}
              />
            }
          />
          <Route path="/rooms" element={<RoomList rooms={config.rooms} />} />
          <Route
            path="/rooms/:roomId"
            element={<RoomDetail rooms={config.rooms} />}
          />
          <Route path="/scenes" element={<SceneList scenes={config.scenes ?? []} />} />
          <Route path="/cameras" element={<Placeholder label="Cameras" />} />
          <Route path="/settings" element={<Placeholder label="Settings" />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
