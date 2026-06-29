import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/.pytest_cache/**",
      "**/.ruff_cache/**",
      "**/dist/**",
      "**/node_modules/**",
      // "tests/typescript/taxPlanCycleMigration.test.ts", // Note, test will fail due to foreign key constraints
    ],
    include: ["tests/typescript/**/*.test.ts"],
  },
});
