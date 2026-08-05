import { and, count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import {
  scenario as scenarioTable,
  taxPlanCycle as taxPlanCycleTable,
} from "./shared/database/schema.js";
import {
  scenarioSchema,
  type Scenario,
  type ScenarioComputedResult,
  type ScenarioTypedFigures,
} from "./scenario.js";

export const maximumScenariosPerCase = 5;

export interface ScenarioCreateInput {
  tenantId: string;
  caseId: string;
  name: string;
  typedFigures: ScenarioTypedFigures;
  computedResult: ScenarioComputedResult;
}

export interface ScenarioRepository {
  create(input: ScenarioCreateInput): Promise<Scenario>;
}

export class ScenarioCaseNotFoundError extends Error {
  constructor() {
    super("The tax plan cycle was not found for this tenant.");
    this.name = "ScenarioCaseNotFoundError";
  }
}

export class ScenarioLimitExceededError extends Error {
  constructor() {
    super(`A tax plan cycle cannot have more than ${maximumScenariosPerCase} scenarios.`);
    this.name = "ScenarioLimitExceededError";
  }
}

export function createScenarioRepository(client: Client): ScenarioRepository {
  const db = drizzle(client);

  return {
    async create(input) {
      return await db.transaction(async (tx) => {
        const cases = await tx
          .select({ id: taxPlanCycleTable.id })
          .from(taxPlanCycleTable)
          .where(
            and(
              eq(taxPlanCycleTable.id, input.caseId),
              eq(taxPlanCycleTable.tenantId, input.tenantId),
            ),
          )
          .for("update")
          .limit(1);

        if (!cases[0]) {
          throw new ScenarioCaseNotFoundError();
        }

        const counts = await tx
          .select({ value: count() })
          .from(scenarioTable)
          .where(eq(scenarioTable.caseId, input.caseId));

        if ((counts[0]?.value ?? 0) >= maximumScenariosPerCase) {
          throw new ScenarioLimitExceededError();
        }

        const rows = await tx
          .insert(scenarioTable)
          .values({
            caseId: input.caseId,
            name: input.name,
            typedFigures: input.typedFigures,
            computedResult: input.computedResult,
          })
          .returning({
            id: scenarioTable.id,
            caseId: scenarioTable.caseId,
            name: scenarioTable.name,
            typedFigures: scenarioTable.typedFigures,
            computedResult: scenarioTable.computedResult,
            createdAt: scenarioTable.createdAt,
          });
        const row = rows[0];

        if (!row) {
          throw new Error("Scenario insert did not return a stored scenario.");
        }

        return scenarioSchema.parse({
          id: row.id,
          case_id: row.caseId,
          name: row.name,
          typed_figures: row.typedFigures,
          computed_result: row.computedResult,
          created_at: row.createdAt.toISOString(),
        });
      });
    },
  };
}
