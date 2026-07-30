import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    cache: false,
    testTimeout: 30_000,
    environment: "jsdom",
    exclude: ["**/dist/**", "**/node_modules/**"],
    include: ["tests/**/*.test.tsx"],
  },
});
