import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Proxy API calls to the FastAPI backend so no CORS issues in dev
    proxy: {
      "/auth":  "http://localhost:8000",
      "/users": "http://localhost:8000",
      "/files": "http://localhost:8000",
    },
  },
});
