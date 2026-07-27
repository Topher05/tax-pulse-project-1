import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    hookTimeout: 60_000,
    testTimeout: 60_000,
    setupFiles: ["tests/typescript/bootstrap/testSetup.ts"],
    exclude: [
      "**/.pytest_cache/**",
      "**/.ruff_cache/**",
      "**/dist/**",
      "**/node_modules/**",
    ],
    include: ["tests/typescript/**/*.integration.test.ts"],
  },
});
