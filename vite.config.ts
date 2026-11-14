import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "程程四级 · CET-4 闯关",
        short_name: "程程四级",
        description: "游戏化大学英语四级沉浸备考 PWA：词汇图汇、听力、阅读、写译与记忆曲线",
        theme_color: "#2563EB",
        background_color: "#F6F8FC",
        display: "standalone",
        orientation: "portrait",
        start_url: "./",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,png,svg,webp,json}"],
        runtimeCaching: [
          {
            urlPattern: /\/seed\/.*\.(mp3|json|webp|png|jpg)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "chengcheng-seed-cache",
              expiration: {
                maxEntries: 600,
                maxAgeSeconds: 60 * 60 * 24 * 60
              }
            }
          }
        ]
      }
    })
  ]
});
