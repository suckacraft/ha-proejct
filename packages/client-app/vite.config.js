import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // Stage 4: minimal manifest foundation. Icons and offline strategy
      // deferred to Stage 11 (provisioning). Switch to InjectManifest when
      // caching strategy is defined.
      manifest: {
        name: "Smart Home",
        short_name: "SmartHome",
        theme_color: "#0c0e14",
        background_color: "#0c0e14",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    globals: true,
  },
});
