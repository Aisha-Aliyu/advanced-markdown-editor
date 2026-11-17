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
        // Supabase answers aren't cached: they hold a signed-in person's documents and
        // account, and a cache shared by everyone on the device could show them to the
        // next person. Offline writing works from the documents saved in localStorage.
      },
    }),
  ],
});
