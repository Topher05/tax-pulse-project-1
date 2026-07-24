import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    testTimeout: 30_000,
    exclude: [
      "**/.pytest_cache/**",
      "**/.ruff_cache/**",
      "**/dist/**",
      "**/node_modules/**",
      // Run smoke.test.ts only through `node --import tsx --test`, not Vitest.
      "tests/typescript/smoke.test.ts",
    ],
    include: ["tests/typescript/**/*.test.ts", "tests/pulseUI/**/*.test.tsx"],
    environmentMatchGlobs: [["tests/pulseUI/**/*.test.tsx", "jsdom"]],
  },
});
