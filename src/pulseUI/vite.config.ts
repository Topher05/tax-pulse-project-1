import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  envDir: "../..",
  envPrefix: ["VITE_", "CASE_"],
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      "^/auth/(login(?:/mfa)?|refresh|logout)$": {
        target: "http://127.0.0.1:3000",
        // Preserve the tenant subdomain used by the BFF to resolve the login workspace.
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: "../../dist/pulseUI",
    emptyOutDir: true,
  },
});
