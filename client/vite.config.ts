import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // The browser talks to /api on the Vite origin; Vite forwards it to the Express API.
    proxy: { "/api": `http://localhost:${process.env.API_PORT ?? 3001}` },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
