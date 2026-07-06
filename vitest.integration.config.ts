import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    hookTimeout: 45_000,
    testTimeout: 45_000,
    exclude: [
      "**/.pytest_cache/**",
      "**/.ruff_cache/**",
      "**/dist/**",
      "**/node_modules/**",
    ],
    include: ["tests/typescript/**/*.integration.ts"],
  },
});
