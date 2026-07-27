import type { Logger } from "pino";

import { ProblemHttpError } from "../../../errors.js";
import { createLogger } from "../../../logger.js";
import type { ScenarioComparisonEngineOutput } from "../scenarioModeling.js";
import type { ScenarioRepository } from "../repositories/scenarios.js";
import type { TaxEngineClient } from "../infrastructure/engineClient.js";
import type { ScenarioTypedFigures } from "../../../scenario.js";
import type { TaxPlanCycleReadInput } from "../repositories/repository.js";
import type { TaxPlanCycleRepository } from "../repositories/repository.js";
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
  logger?: Logger;
}

function modelingUnavailableError(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/scenario-modeling-unavailable",
    title: "Scenario Modeling Unavailable",
    status: 409,
    detail: "Scenario modeling is only available while the case is in Modeling stage.",
  });
}

function formatEstTimestamp(occurredAt: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    dateStyle: "short",
    timeStyle: "medium",
    hour12: false,
  }).format(occurredAt);
}

function taxEngineUnavailableError(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/tax-engine-unavailable",
    title: "Tax Engine Unavailable",
    status: 502,
    detail: "The liability engine request failed after retries.",
  });
}

function logTaxEngineFailure(
  logger: Logger,
  error: unknown,
  input: ScenarioModelingControllerInput,
): void {
  const occurredAt = new Date();
  const failureLogger = logger.child({
    boundary: "tax-plan-cycle-scenario-modeling",
    calling_function: "createScenarioModelingController.model",
    occurred_at_est: formatEstTimestamp(occurredAt),
    occurred_at_utc: occurredAt.toISOString(),
    tenant_id: input.tenantId,
    case_id: input.caseId,
    upstream_service: "liability-engine",
  });
  const normalizedError =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "Unexpected liability engine failure");

  failureLogger.error(normalizedError, "scenario modeling failed");
}

export function createScenarioModelingController(
  options: ScenarioModelingControllerOptions,
): ScenarioModelingController {
  const logger = options.logger ?? createLogger();

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

      let engineResults: ScenarioComparisonEngineOutput;

      try {
        engineResults = await options.taxEngineClient.compareScenarios({
          tenantId: input.tenantId,
          authorizationHeader: input.authorizationHeader,
          baseline: input.baseline,
          scenarios: [...input.scenarios],
        });
      } catch (error) {
        logTaxEngineFailure(logger, error, input);
        throw taxEngineUnavailableError();
      }

      if (engineResults.length !== input.scenarios.length) {
        const mismatchError = new Error(
          "Tax Engine returned an unexpected number of scenario results.",
        );

        logTaxEngineFailure(logger, mismatchError, input);
        throw taxEngineUnavailableError();
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
