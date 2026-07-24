import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/pulseUI",
  plugins: [react()],
  build: {
    outDir: "../../dist/pulseUI",
    emptyOutDir: true,
  },
});
