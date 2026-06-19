# Deploying the marketing site (smartboyz.com.au)

Target: a **second** Cloudflare Pages project named **`smartboyz-www`** (separate from
`smarthome-app`, which serves `app.smartboyz.com.au`).

> **Use the Git integration, not local `deploy:www`.** This repo lives on a remote SMB
> drive (`Z:` = `\\JOSH\smarthome`) that drops files during `npm install`, so a local
> Windows build is unreliable. Cloudflare builds on Linux (local disk) where install,
> `sharp` image optimization, and the build all work cleanly.

## Option A — Git integration (recommended)

1. **Push the branch** to GitHub (`feat/marketing-site`, then merge to `main` for production).
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → select this repo.
3. **Build settings:**
   | Setting | Value |
   |---|---|
   | Project name | `smartboyz-www` |
   | Production branch | `main` |
   | Framework preset | Astro (or None) |
   | **Root directory** | `packages/marketing-site` |
   | Build command | `npm install && npm run build` |
   | Build output directory | `dist` |

   Setting **Root directory = `packages/marketing-site`** is important: it makes Cloudflare
   install the package's own deps, build there, and auto-detect the **`functions/`** dir
   (the lead-capture endpoint) relative to it.
4. **Environment variables** (Settings → Environment variables):
   | Name | Value | Notes |
   |---|---|---|
   | `NODE_VERSION` | `22` | Astro 6 needs Node ≥ 20.3 / 22; pin it |
   | `LEAD_WEBHOOK_URL` | *(your webhook)* | Where consult leads POST (Slack/Discord/Make/Zapier/email relay). If unset, the form still works but only logs. |
5. **Save & Deploy.** First build runs; subsequent pushes auto-deploy. PRs get preview URLs.

## Option B — Direct upload (`deploy:www`)

`npm run deploy:www` (root script) builds + `wrangler pages deploy`. Works from a machine with
a clean `node_modules` (Linux/CI, or a local-disk checkout) after `npx wrangler login`. **Do
not run it from this Windows/SMB machine** — the build will fail on dropped files.

## Custom domains

In the `smartboyz-www` project → **Custom domains**, add both:
- `smartboyz.com.au`
- `www.smartboyz.com.au`

Pick one canonical (e.g. apex `smartboyz.com.au`) and 301-redirect the other (Cloudflare
Redirect Rule). The canonical is already set in `astro.config.mjs` (`site:`) and flows into
the sitemap + `Seo.astro` canonical tag. `app.` and `ha.` hostnames are unaffected.

## Post-deploy checklist

- [ ] `https://smartboyz.com.au` serves the site over HTTPS.
- [ ] `/sitemap-index.xml` and `/robots.txt` resolve.
- [ ] Submit the consult form → redirects to `/thanks`; lead arrives at `LEAD_WEBHOOK_URL`.
- [ ] OG preview looks right (`/og/og-default.png`) — test with a social-card debugger.
- [ ] Lighthouse on the deployed URL: Perf/SEO/Best-Practices/A11y ≥ 95 (Linux build applies
      full `sharp` image optimization, unlike local Windows preview).
