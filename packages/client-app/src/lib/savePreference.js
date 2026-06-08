export async function savePreference(key, value) {
  const res = await fetch(`/api/preferences/${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`Preference save failed: ${res.status}`);
}
