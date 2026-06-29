import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/.pytest_cache/**",
      "**/.ruff_cache/**",
      "**/dist/**",
      "**/node_modules/**",
      "tests/typescript/taxPlanCycleMigration.test.ts",
    ],
    include: ["tests/typescript/**/*.test.ts"],
  },
});
