import { useState, type FormEvent } from "react";
import type { LeadField } from "../../content/site";

interface Props {
  endpoint: string;
  successUrl: string;
  /** Field config — the single source of truth lives in site.leadCapture.fields. */
  fields: readonly LeadField[];
  submitLabel: string;
}

type Status = "idle" | "submitting" | "error";

/**
 * The single hydrated island on the site (client:visible). The form is rendered
 * entirely from `fields` (site.leadCapture.fields) so copy + field set stay in
 * the content file. Progressive-enhanced: the underlying <form> posts to the
 * same endpoint even without JS.
 */
export default function LeadCapture({
  endpoint,
  successUrl,
  fields,
  submitLabel,
}: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError("");

    const form = e.currentTarget;
    const fd = new FormData(form);

    // Build the payload, collapsing multi-value (checkbox) fields into arrays.
    const data: Record<string, unknown> = {};
    for (const f of fields) {
      data[f.name] =
        f.type === "multiselect" ? fd.getAll(f.name) : fd.get(f.name) ?? "";
    }
    data.company = fd.get("company") ?? ""; // honeypot

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Something went wrong. Please try again.");
      }
      window.location.href = successUrl;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-border bg-canvas px-4 py-3 text-[15px] text-white placeholder:text-white/30 outline-none transition-colors focus:border-primary/60";
  const labelClass =
    "font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40";

  return (
    <form
      action={endpoint}
      method="POST"
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
      noValidate
    >
      {/* Honeypot — bots fill this, humans don't. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((f) => {
          const id = `lc-${f.name}`;
          const span = f.full ? "sm:col-span-2" : "";

          return (
            <div key={f.name} className={`flex flex-col gap-2 ${span}`}>
              <label className={labelClass} htmlFor={id}>
                {f.label}
                {!f.required && f.type !== "multiselect" && (
                  <span className="text-white/25"> (optional)</span>
                )}
              </label>

              {f.type === "select" ? (
                <select
                  id={id}
                  name={f.name}
                  required={f.required}
                  defaultValue=""
                  className={fieldClass}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {f.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : f.type === "multiselect" ? (
                <div className="flex flex-wrap gap-2" role="group" aria-label={f.label}>
                  {f.options?.map((opt) => (
                    <label
                      key={opt}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-canvas px-4 py-2 text-sm text-white/80 transition-colors has-[:checked]:border-primary/60 has-[:checked]:text-white"
                    >
                      <input
                        type="checkbox"
                        name={f.name}
                        value={opt}
                        className="h-4 w-4 accent-primary"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  id={id}
                  name={f.name}
                  type={f.type}
                  required={f.required}
                  autoComplete={f.autoComplete}
                  placeholder={f.placeholder}
                  className={fieldClass}
                />
              )}
            </div>
          );
        })}
      </div>

      {status === "error" && (
        <p
          role="alert"
          className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-white"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-white transition-transform duration-150 hover:brightness-110 active:scale-[0.97] disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : submitLabel}
      </button>

      <p className="text-xs text-white/35">
        We'll only use your details to arrange your consultation. No spam, ever.
      </p>
    </form>
  );
}
