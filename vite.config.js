import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync("key.pem"),
      cert: fs.readFileSync("cert.pem"),
    },
    host: "0.0.0.0", // Allow external connections
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false, // Allow self-signed certificates
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 2000, // handle warning on vendor.js bundle size
  },
  base: "./",
});
