import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const repositoryRoot = process.cwd();
const sourceRoot = resolve(repositoryRoot, "src/typescript");

describe("Core Case TypeScript structure", () => {
  test("keeps the service source root limited to entry and tool configuration files", () => {
    const rootFiles = readdirSync(sourceRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();

    expect(rootFiles).toEqual(["index.ts", "vitest.config.ts"]);
  });

  test("keeps cross-cutting modules in explicit feature, application, or platform owners", () => {
    const expectedPaths = [
      "app/createApp.ts",
      "app/openapi/coreCaseOpenApi.ts",
      "features/assist/index.ts",
      "features/audit/index.ts",
      "features/auth/index.ts",
      "features/taxPlanCycle/domain/scenario.ts",
      "features/taxReference/index.ts",
      "platform/http/index.ts",
    ];

    for (const expectedPath of expectedPaths) {
      expect(existsSync(resolve(sourceRoot, expectedPath)), expectedPath).toBe(true);
    }
  });

  test("does not recreate the legacy flat modules", () => {
    const legacyPaths = [
      "app.ts",
      "authConfig.ts",
      "auditEntryRepository.ts",
      "bracketReferenceRepository.ts",
      "costAccounting.ts",
      "errors.ts",
      "scenario.ts",
      "tenantRateLimiting.ts",
    ];

    for (const legacyPath of legacyPaths) {
      expect(existsSync(resolve(sourceRoot, legacyPath)), legacyPath).toBe(false);
    }
  });
});
