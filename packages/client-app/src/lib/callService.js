export async function callService(domain, service, body = {}) {
  const res = await fetch(`/api/services/${domain}/${service}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Service call failed: ${res.status}`);
  return res.json();
}
