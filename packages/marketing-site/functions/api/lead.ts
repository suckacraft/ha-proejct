/**
 * Cloudflare Pages Function — POST /api/lead
 *
 * Receives consult-request leads from the marketing site (static output, so this
 * runs as an edge Function rather than an Astro SSR route).
 *
 * Destination is TBD: set LEAD_WEBHOOK_URL in the Pages project env to forward
 * leads (e.g. to a Slack/Discord/Make/Zapier webhook or an email relay). Until
 * that is configured the Function validates and accepts the lead but only logs it
 * — so the form is functional end-to-end without pretending it's wired to a CRM.
 */

interface Env {
  LEAD_WEBHOOK_URL?: string;
}

interface Lead {
  name?: string;
  email?: string;
  phone?: string;
  suburb?: string;
  homeType?: string;
  rooms?: string;
  interests?: string | string[];
  message?: string;
  company?: string; // honeypot
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Lead;
  try {
    const ct = request.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      body = await request.json();
    } else {
      body = Object.fromEntries((await request.formData()).entries()) as Lead;
    }
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  // Honeypot: real users never fill this.
  if (body.company && body.company.trim() !== "") {
    return json({ ok: true }); // silently accept, drop
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  if (name.length < 1) return json({ error: "Please enter your name." }, 422);
  if (!EMAIL_RE.test(email))
    return json({ error: "Please enter a valid email address." }, 422);

  const interests = Array.isArray(body.interests)
    ? body.interests
    : body.interests
      ? [body.interests]
      : [];

  const lead = {
    name,
    email,
    phone: (body.phone ?? "").trim(),
    suburb: (body.suburb ?? "").trim(),
    homeType: (body.homeType ?? "").trim(),
    rooms: (body.rooms ?? "").trim(),
    interests,
    message: (body.message ?? "").trim(),
    source: "smartboyz.com.au",
    receivedAt: new Date().toISOString(),
  };

  if (env.LEAD_WEBHOOK_URL) {
    try {
      const res = await fetch(env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(lead),
      });
      if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
    } catch (err) {
      console.error("Lead forward failed:", err);
      return json(
        { error: "We couldn't send your request. Please try again or email us." },
        502,
      );
    }
  } else {
    // No destination configured yet — accept + log so the UX works end-to-end.
    console.log("LEAD (no LEAD_WEBHOOK_URL configured):", JSON.stringify(lead));
  }

  return json({ ok: true });
};
