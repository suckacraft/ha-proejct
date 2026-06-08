import { useEffect, useCallback } from "react";
import { useEntityStore } from "../store/entities.js";

export function useHA() {
  const setEntity = useEntityStore((s) => s.setEntity);
  const removeEntity = useEntityStore((s) => s.removeEntity);

  useEffect(() => {
    const es = new EventSource("/api/events");

    es.addEventListener("state_changed", (event) => {
      const data = JSON.parse(event.data);
      if (data.removed) {
        removeEntity(data.id);
      } else {
        setEntity(data);
      }
    });

    return () => es.close();
  }, [setEntity, removeEntity]);

  const callService = useCallback(async (domain, service, body = {}) => {
    const res = await fetch(`/api/services/${domain}/${service}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }, []);

  return { callService };
}
