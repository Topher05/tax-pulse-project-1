import { ProblemHttpError } from "../../../errors.js";
import type { ScenarioComparisonEngineOutput } from "../scenarioModeling.js";
import type { ScenarioRepository } from "../repositories/scenarios.js";
import type { TaxEngineClient } from "../infrastructure/engineClient.js";
import type { ScenarioTypedFigures } from "../../../scenario.js";
import type { TaxPlanCycleReadInput } from "../repository/repository.js";
import type { TaxPlanCycleRepository } from "../repository/repository.js";
import type { ScenarioModelingScenarioInput } from "../scenarioModeling.js";

export interface ScenarioModelingControllerInput extends TaxPlanCycleReadInput {
  authorizationHeader: string;
  baseline: ScenarioTypedFigures;
  scenarios: ReadonlyArray<ScenarioModelingScenarioInput>;
}

export interface ScenarioModelingController {
  model(
    input: ScenarioModelingControllerInput,
  ): Promise<Awaited<ReturnType<ScenarioRepository["createMany"]>>>;
}

export interface ScenarioModelingControllerOptions {
  taxPlanCycleRepository: Pick<TaxPlanCycleRepository, "findByCaseId">;
  scenarioRepository: Pick<ScenarioRepository, "createMany">;
  taxEngineClient: TaxEngineClient;
}

function modelingUnavailableError(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/scenario-modeling-unavailable",
    title: "Scenario Modeling Unavailable",
    status: 409,
    detail: "Scenario modeling is only available while the case is in Modeling stage.",
  });
}

export function createScenarioModelingController(
  options: ScenarioModelingControllerOptions,
): ScenarioModelingController {
  return {
    async model(input) {
      const cycle = await options.taxPlanCycleRepository.findByCaseId({
        tenantId: input.tenantId,
        caseId: input.caseId,
      });

      if (cycle === null) {
        throw new ProblemHttpError({
          type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
          title: "Tax Plan Cycle Not Found",
          status: 404,
          detail: "No tax plan cycle was found for the requested case ID.",
        });
      }

      if (cycle.stage !== "Modeling") {
        throw modelingUnavailableError();
      }

      const engineResults: ScenarioComparisonEngineOutput = await options.taxEngineClient.compareScenarios({
        tenantId: input.tenantId,
        authorizationHeader: input.authorizationHeader,
        baseline: input.baseline,
        scenarios: [...input.scenarios],
      });

      if (engineResults.length !== input.scenarios.length) {
        throw new Error("Tax Engine returned an unexpected number of scenario results.");
      }

      return await options.scenarioRepository.createMany({
        tenantId: input.tenantId,
        caseId: input.caseId,
        scenarios: engineResults.map((scenario, index) => ({
          name: scenario.name,
          typedFigures: input.scenarios[index]!.typed_figures,
          computedResult: {
            totalTax: scenario.total_tax,
            deltaVBaseline: scenario.delta_vs_baseline,
          },
        })),
      });
    },
  };
}
