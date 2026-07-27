import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    hookTimeout: 60_000,
    testTimeout: 60_000,
    setupFiles: ["tests/typescript/bootstrap/testSetup.ts"],
    include: ["tests/typescript/**/*.test.ts"],
    exclude: [
      "**/.pytest_cache/**",
      "**/.pytest_tmp/**",
      "**/.ruff_cache/**",
      "**/.venv/**",
      "**/dist/**",
      "**/node_modules/**",
      "src/pulseUI/**",
      "tests/typescript/smoke.test.ts",
      "**/*.integration.test.ts",
    ],
  },
});
