// Author: Mohd Faraz (https://faraazz05.github.io)
// CopilOPS AIP - Vite Configuration for GitHub Pages & Local Dev

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./", // Relative paths for GitHub Pages (faraazz05.github.io/copilops-aip/)
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    }
  }
});
