import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  envDir: "../..",
  envPrefix: ["VITE_", "CASE_"],
  plugins: [tailwindcss(), react()],
  build: {
    outDir: "../../dist/pulseUI",
    emptyOutDir: true,
  },
});
