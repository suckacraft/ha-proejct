// @ts-check
import {
  defineConfig,
  sharpImageService,
  passthroughImageService,
} from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// SmartBoyz marketing site — static output for best Core Web Vitals / SEO.
// Tailwind v4 is wired through the Vite plugin (same as client-app), NOT the
// legacy @astrojs/tailwind integration. Design tokens live in src/styles/global.css.
export default defineConfig({
  site: "https://smartboyz.com.au",
  output: "static",
  integrations: [react(), mdx(), sitemap()],
  image: {
    // Sharp's native binary will not install on the local Windows dev drive, so
    // use the no-op passthrough service there. The Cloudflare Pages build runs on
    // Linux, where sharp installs cleanly and full image optimization (resize,
    // AVIF/WebP) is applied. So production keeps optimized images; only local
    // Windows preview serves originals.
    service:
      process.platform === "win32"
        ? passthroughImageService()
        : sharpImageService(),
  },
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    // client-app = 5173, operator-app = 5174 → marketing-site = 5175
    port: 5175,
  },
});
