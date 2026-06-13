import { useEffect } from "react";
import { useEntityStore } from "../store/entities.js";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export function useHA() {
  const setEntity = useEntityStore((s) => s.setEntity);
  const removeEntity = useEntityStore((s) => s.removeEntity);

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/events`);

    es.addEventListener("state_changed", (event) => {
      const data = JSON.parse(event.data);
      if (data.removed) {
        removeEntity(data.id);
      } else {
        setEntity(data);
      }
    });

    // Seed store with current snapshot so tiles populate immediately.
    // SSE delivers incremental updates from this point forward.
    fetch(`${API_BASE}/api/entities`)
      .then((r) => r.json())
      .then((entities) => entities.forEach(setEntity))
      .catch(console.error);

    return () => es.close();
  }, [setEntity, removeEntity]);
}
