import { describe, expect, test } from "vitest";

import { taxPlanCycleRows, tenantRows } from "../../src/typescript/db/seed.model.js";
import {
  createScenarioRepository,
  maximumScenariosPerCase,
  ScenarioCaseNotFoundError,
  ScenarioLimitExceededError,
} from "../../src/typescript/scenarioRepository.js";
import { withDockerDrizzleSeededDatabase } from "./bootstrap/migrationTestUtils.js";

const typedFigures = {
  income: 250_000,
  deductions: 30_000,
  state: "CA",
  filing_status: "married_filing_jointly",
} as const;

const computedResult = {
  federal_liability: 45_000,
  state_liability: 18_000,
  effective_rate: 0.252,
  marginal_rate: 0.32,
  quarterly_estimate: 15_750,
} as const;

describe("scenario repository", () => {
  test("persists five scenarios and rejects a sixth for the same case", { timeout: 30000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const repository = createScenarioRepository(client);
      const input = {
        tenantId: tenantRows[0].id,
        caseId: taxPlanCycleRows[0].id,
        typedFigures,
        computedResult,
      };

      for (let scenarioNumber = 1; scenarioNumber <= maximumScenariosPerCase; scenarioNumber += 1) {
        const stored = await repository.create({
          ...input,
          name: `Scenario ${scenarioNumber}`,
        });

        expect(stored).toMatchObject({
          case_id: input.caseId,
          name: `Scenario ${scenarioNumber}`,
          typed_figures: typedFigures,
          computed_result: computedResult,
        });
      }

      await expect(
        repository.create({ ...input, name: "Scenario 6" }),
      ).rejects.toBeInstanceOf(ScenarioLimitExceededError);
    });
  });

  test("does not permit a tenant to add scenarios to another tenant's case", { timeout: 30000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const repository = createScenarioRepository(client);

      await expect(
        repository.create({
          tenantId: tenantRows[1].id,
          caseId: taxPlanCycleRows[0].id,
          name: "Cross-tenant scenario",
          typedFigures,
          computedResult,
        }),
      ).rejects.toBeInstanceOf(ScenarioCaseNotFoundError);
    });
  });
});
