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
import Header from "./components/shared/Header.jsx";
import BottomNav from "./components/shared/BottomNav.jsx";
import RoomList from "./components/rooms/RoomList.jsx";
import RoomDetail from "./components/rooms/RoomDetail.jsx";

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

  useEffect(() => {
    loadConfig().then(setConfig);
  }, []);

  if (!config) return null;

  const isRoomDetail = /^\/rooms\/.+/.test(location.pathname);

  return (
    <div className="flex flex-col h-dvh bg-canvas text-white font-sans overflow-hidden">
      <Header
        clientName={config.clientName}
        logoUrl={config.logoUrl}
        onBack={isRoomDetail ? () => navigate(-1) : undefined}
      />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/rooms" replace />} />
          <Route path="/rooms" element={<RoomList rooms={config.rooms} />} />
          <Route
            path="/rooms/:roomId"
            element={<RoomDetail rooms={config.rooms} />}
          />
          <Route path="/scenes" element={<Placeholder label="Scenes" />} />
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
