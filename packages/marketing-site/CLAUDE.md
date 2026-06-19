# CLAUDE.md — marketing-site (smartboyz.com)

The public, customer-facing landing site. Separate from the product apps: it sells the
SmartBoyz experience (homeowner app + done-for-you installation & support). Optimised for
**design quality** and **performance/SEO**.

## Stack

- **Astro 6**, `output: 'static'` — no SSR adapter. Pure prerendered HTML for best Core Web Vitals.
- **React islands** only where interactivity is required. Hydrate with `client:visible`, never
  `client:load`, unless above-the-fold interactivity demands it. Right now the **only** island is
  `components/react/LeadCapture.tsx`.
- **Tailwind v4** via **PostCSS** (`@tailwindcss/postcss`, see `postcss.config.mjs`), NOT the
  `@tailwindcss/vite` plugin (that plugin breaks on the rolldown-based Vite that Astro 6 bundles:
  "Missing field tsconfigPaths"). No `tailwind.config` — tokens live in `@theme` in
  `src/styles/global.css`. `overrides.vite: ^7` in package.json pins Vite to what Astro expects.
- **MDX + sitemap** integrations enabled. Lead form is a **Cloudflare Pages Function**
  (`functions/api/lead.ts`), not an Astro route.
- All deps **pinned exact** (root rule 6). Install per-package: `npm install --prefix packages/marketing-site`
  (workspace `-w` does not resolve on this drive — use `--prefix`).

## Design language (inherited from root CLAUDE.md — do not reinvent)

The brand IS the differentiation directive. Apply the *frontend-design* skill's discipline
(intentional hierarchy, bold composition, no AI-slop layouts) **within** these locked tokens —
do not introduce novel fonts or colours.

- **Three surfaces only:** canvas `#0c0e14`, surface `#161920`, raised `#1e222c` (shared with
  client-app). Depth via **borders, not shadows** (`border-border` resting, `border-primary/40`
  active/hover).
- **Single accent:** `--color-primary` `#f97316` (electric orange). NOTE: this intentionally
  diverges from client-app's blue `#2563eb`, per the brand brief — the marketing site has its own
  accent while sharing the surface scale. Never introduce a second accent colour.
- **Type:** Display = Barlow Condensed (`font-display`, headings/labels, uppercase, tracking-tight);
  Body = DM Sans (`font-sans`, prose). Every hierarchy level changes **both weight and size**.
  Fonts are **self-hosted** via `@fontsource` (no Google Fonts `<link>`).
- **Spacing:** 8px grid. **Motion:** `duration-150` state transitions; `active:scale-[0.97]` on
  press; `prefers-reduced-motion` zeroes durations (handled in global.css).
- **Icons:** inline SVG via `components/Icon.astro`. No icon library.

## Content

All copy lives in `src/content/site.ts` (single source of truth, hand-editable). `TODO(content)`
markers flag placeholders that need real business details. Do not hardcode copy in components.

## SEO / performance / a11y (keep green)

- Canonical + OG + Twitter + JSON-LD (`Organization`, `Service`, `FAQPage`) via `components/Seo.astro`.
- `site:` is set in `astro.config.mjs` → drives sitemap + canonical.
- Images: always `astro:assets` `<Image>` with explicit dims; LCP hero `loading="eager"
  fetchpriority="high"`, everything else `loading="lazy"`.
- One `<h1>` per page; semantic landmarks; labelled inputs; visible focus; alt text on all images.

## Commands

```bash
npm install --prefix packages/marketing-site   # install deps
npm run dev     --prefix packages/marketing-site   # dev server → http://localhost:5175
npm run check   --prefix packages/marketing-site   # astro check (types + links)
npm run build   --prefix packages/marketing-site   # static build → dist/
npm run preview --prefix packages/marketing-site   # preview the build
npm run deploy:www                                  # (from root) build + wrangler deploy to smartboyz-www
```

To test the lead Function locally (astro dev does NOT run Functions):
`npm run build --prefix packages/marketing-site && cd packages/marketing-site && npx wrangler pages dev dist`
