import { useEffect } from "react";
import { usePreferencesStore } from "../store/preferences.js";

// Hydrates the preferences store from /api/preferences on mount.
// Follows the same pattern as useHA: one fetch, no polling.
export function usePreferences() {
  const hydrate = usePreferencesStore((s) => s.hydrate);

  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then(hydrate)
      .catch(console.error);
  }, [hydrate]);
}
