import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
    proxy: {
      // Local backend
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Same proxy shape as vercel.json, so Unsplash URLs work in development
      "/images": {
        target: "https://images.unsplash.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/images/, ""),
      },
    },
  },
});
