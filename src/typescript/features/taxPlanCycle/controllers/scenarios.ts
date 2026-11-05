import { ProblemHttpError } from "../../../platform/http/errors.js";
import type { ScenarioComparisonEngineOutput } from "../scenarioModeling.js";
import type { ScenarioRepository } from "../repositories/scenarios.js";
import type { TaxEngineClient } from "../infrastructure/engineClient.js";
import type { ScenarioTypedFigures } from "../domain/scenario.js";
import type { TaxPlanCycleReadInput } from "../repositories/repository.js";
import type { TaxPlanCycleRepository } from "../repositories/repository.js";
import type { ScenarioModelingScenarioInput } from "../scenarioModeling.js";
import {
  emitObservabilityEvent,
  type TraceContext,
  type StructuredLogger,
} from "../../../shared/cloud-logger/observability.js";

export interface ScenarioModelingControllerInput extends TaxPlanCycleReadInput {
  authorizationHeader: string;
  baseline: ScenarioTypedFigures;
  scenarios: ReadonlyArray<ScenarioModelingScenarioInput>;
  requestContext?: Partial<TraceContext>;
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
  telemetryLogger?: StructuredLogger;
}

function modelingUnavailableError(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/scenario-modeling-unavailable",
    title: "Scenario Modeling Unavailable",
    status: 409,
    detail: "Scenario modeling is only available while the case is in Modeling stage.",
  });
}

function taxEngineUnavailableError(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/tax-engine-unavailable",
    title: "Tax Engine Unavailable",
    status: 502,
    detail: "The liability engine request failed after retries.",
  });
}

export function createScenarioModelingController(
  options: ScenarioModelingControllerOptions,
): ScenarioModelingController {
  const telemetryLogger = options.telemetryLogger ?? console;

  return {
    async model(input) {
      const startedAt = Date.now();
      const traceContext = input.requestContext ?? {};

      emitObservabilityEvent(telemetryLogger, "info", "scenario modeling started", {
        service: "core-case-service",
        layer: "controller",
        operation: "scenario_modeling",
        outcome: "started",
        tenant_id: input.tenantId,
        case_id: input.caseId,
        ...traceContext,
        metric_name: "tax_plan_cycle.scenario_modeling.count",
        metric_value: 1,
        metric_unit: "Count",
      });

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
          requestContext: input.requestContext,
        });
      } catch (error) {
        emitObservabilityEvent(telemetryLogger, "error", "scenario modeling failed", {
          service: "core-case-service",
          layer: "controller",
          operation: "scenario_modeling",
          dependency: "tax-engine",
          tenant_id: input.tenantId,
          case_id: input.caseId,
          outcome: "failed",
          duration_ms: Date.now() - startedAt,
          error_class: error instanceof Error ? error.name : "Error",
          error: error instanceof Error ? error.message : String(error),
          ...traceContext,
          metric_name: "tax_plan_cycle.scenario_modeling.count",
          metric_value: 1,
          metric_unit: "Count",
        });
        throw taxEngineUnavailableError();
      }

      if (engineResults.length !== input.scenarios.length) {
        emitObservabilityEvent(telemetryLogger, "error", "scenario modeling response mismatch", {
          service: "core-case-service",
          layer: "controller",
          operation: "scenario_modeling",
          dependency: "tax-engine",
          tenant_id: input.tenantId,
          case_id: input.caseId,
          outcome: "failed",
          duration_ms: Date.now() - startedAt,
          ...traceContext,
          metric_name: "tax_plan_cycle.scenario_modeling.count",
          metric_value: 1,
          metric_unit: "Count",
        });
        throw taxEngineUnavailableError();
      }

      emitObservabilityEvent(telemetryLogger, "info", "scenario modeling completed", {
        service: "core-case-service",
        layer: "controller",
        operation: "scenario_modeling",
        dependency: "tax-engine",
        tenant_id: input.tenantId,
        case_id: input.caseId,
        outcome: "success",
        duration_ms: Date.now() - startedAt,
        ...traceContext,
        metric_name: "tax_plan_cycle.scenario_modeling.duration_ms",
        metric_value: Date.now() - startedAt,
        metric_unit: "Milliseconds",
      });

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
