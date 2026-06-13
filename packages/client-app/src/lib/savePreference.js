const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function savePreference(key, value) {
  const res = await fetch(`${API_BASE}/api/preferences/${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`Preference save failed: ${res.status}`);
}
