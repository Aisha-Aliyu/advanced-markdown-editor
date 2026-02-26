import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["fonts/**", "icons/**"],
      manifest: {
        name:             "Inkwell — Markdown Editor",
        short_name:       "Inkwell",
        description:      "A powerful markdown editor with themes, cloud sync, and collaboration.",
        theme_color:      "#0f0f10",
        background_color: "#0f0f10",
        display:          "standalone",
        orientation:      "any",
        scope:            "/",
        start_url:        "/",
        icons: [
          {
            src:     "/icons/icon.svg",
            sizes:   "any",
            type:    "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,ttf}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler:    "NetworkFirst",
            options: {
              cacheName:  "supabase-cache",
              expiration: { maxEntries: 20, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
});
