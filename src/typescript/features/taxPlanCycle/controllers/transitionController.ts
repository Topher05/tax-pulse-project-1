import type { TaxPlanCycle } from "../taxPlanCycle.js";
import type {
  TaxPlanCycleReadInput,
  TaxPlanCycleRepository,
  TaxPlanCycleTransitionInput,
} from "../repositories/repository.js";
import type { TaxPlanCycleQueueCacheInvalidator } from "../infrastructure/queueCache.js";
import type { StageChangedEventPublisher } from "../infrastructure/cloudEvents/stageChanged/index.js";
import type {
  ActionItemCreatedEventInput,
  ActionItemCreatedEventPublishInput,
} from "../infrastructure/cloudEvents/actionItemCreated/index.js";
import { createPresentToClientSaga } from "../infrastructure/cloudEvents/presentToClientSaga/index.js";
import {
  emitObservabilityEvent,
  type StructuredLogger,
} from "../../../shared/cloud-logger/observability.js";

export interface ActionItemCreatedEventPublisher {
  publishActionItemCreated(
    input: ActionItemCreatedEventPublishInput,
  ): Promise<void> | void;
}

export interface TaxPlanCycleTransitionControllerInput
  extends TaxPlanCycleTransitionInput {
  fromStage: TaxPlanCycle["stage"];
  actionItem?: ActionItemCreatedEventInput;
}

export interface TaxPlanCycleTransitionController {
  transition(
    input: TaxPlanCycleTransitionControllerInput,
  ): Promise<TaxPlanCycle | null> | TaxPlanCycle | null;
  findByCaseId(
    input: TaxPlanCycleReadInput,
  ): Promise<TaxPlanCycle | null> | TaxPlanCycle | null;
}

export interface TaxPlanCycleTransitionEventLogger {
  warn(...args: unknown[]): void;
}

export interface TaxPlanCycleTransitionControllerOptions {
  queueCacheInvalidator?: TaxPlanCycleQueueCacheInvalidator;
  stageChangedEventPublisher?: StageChangedEventPublisher;
  actionItemEventPublisher?: ActionItemCreatedEventPublisher;
  stageChangedEventLogger?: TaxPlanCycleTransitionEventLogger;
  telemetryLogger?: StructuredLogger;
}

export function createTaxPlanCycleTransitionController(
  repository: TaxPlanCycleRepository,
  options: TaxPlanCycleTransitionControllerOptions = {},
): TaxPlanCycleTransitionController {
  const eventLogger = options.stageChangedEventLogger ?? console;
  const telemetryLogger = options.telemetryLogger ?? console;

  return {
    transition: async (input) => {
      const startedAt = Date.now();
      emitObservabilityEvent(telemetryLogger, "info", "transition started", {
        service: "core-case-service",
        layer: "workflow",
        operation: "transition",
        tenant_id: input.tenantId,
        case_id: input.caseId,
        outcome: "started",
        metric_name: "tax_plan_cycle.transition.count",
        metric_value: 1,
        metric_unit: "Count",
      });
      const transitioned = await repository.transition(input);
      if (!transitioned) {
        emitObservabilityEvent(telemetryLogger, "warn", "transition not found", {
          service: "core-case-service",
          layer: "workflow",
          operation: "transition",
          tenant_id: input.tenantId,
          case_id: input.caseId,
          outcome: "not_found",
          metric_name: "tax_plan_cycle.transition.count",
          metric_value: 1,
          metric_unit: "Count",
        });
        return null;
      }

      if (options.stageChangedEventPublisher) {
        const publishStartedAt = Date.now();
        // CL, Best-effort after commit: the database mutation owns the state change, and the SNS publish follows as an event side effect. Might rework with dev sync post Jira-156 merge
        try {
          emitObservabilityEvent(telemetryLogger, "info", "stage changed publish started", {
            service: "core-case-service",
            layer: "workflow",
            operation: "stage_changed_publish",
            dependency: "sns",
            tenant_id: input.tenantId,
            case_id: input.caseId,
            from_stage: input.fromStage,
            to_stage: input.toStage,
            actor: input.actor,
            outcome: "started",
            metric_name: "tax_plan_cycle.stage_changed_publish.count",
            metric_value: 1,
            metric_unit: "Count",
          });
          await options.stageChangedEventPublisher.publishStageChanged({
            tenantId: input.tenantId,
            caseId: input.caseId,
            fromStage: input.fromStage,
            toStage: input.toStage,
            actor: input.actor,
          });
          emitObservabilityEvent(telemetryLogger, "info", "stage changed publish completed", {
            service: "core-case-service",
            layer: "workflow",
            operation: "stage_changed_publish",
            dependency: "sns",
            tenant_id: input.tenantId,
            case_id: input.caseId,
            from_stage: input.fromStage,
            to_stage: input.toStage,
            actor: input.actor,
            outcome: "success",
            duration_ms: Date.now() - publishStartedAt,
            metric_name: "tax_plan_cycle.stage_changed_publish.duration_ms",
            metric_value: Date.now() - publishStartedAt,
            metric_unit: "Milliseconds",
          });
        } catch (error) {
          eventLogger.warn(
            {
              err: error,
              tenant_id: input.tenantId,
              case_id: input.caseId,
              from_stage: input.fromStage,
              to_stage: input.toStage,
              actor: input.actor,
            },
            "Stage-changed event publish failed after transition commit",
          );
        }
      }

      if (transitioned && options.actionItemEventPublisher && input.actionItem) {
        const presentToClientSaga = createPresentToClientSaga({
          repository,
          stageChangedEventPublisher: options.stageChangedEventPublisher,
          actionItemEventPublisher: options.actionItemEventPublisher,
        });

        const sagaStartedAt = Date.now();
        emitObservabilityEvent(telemetryLogger, "info", "present-to-client saga started", {
          service: "core-case-service",
          layer: "workflow",
          operation: "present_to_client_saga",
          dependency: "sns",
          tenant_id: input.tenantId,
          case_id: input.caseId,
          actor: input.actor,
          outcome: "started",
          metric_name: "tax_plan_cycle.present_to_client_saga.count",
          metric_value: 1,
          metric_unit: "Count",
        });
        await presentToClientSaga.run({
          transitionedCycle: transitioned,
          tenantId: input.tenantId,
          caseId: input.caseId,
          actor: input.actor,
          actionItem: input.actionItem,
        });
        emitObservabilityEvent(telemetryLogger, "info", "present-to-client saga completed", {
          service: "core-case-service",
          layer: "workflow",
          operation: "present_to_client_saga",
          dependency: "sns",
          tenant_id: input.tenantId,
          case_id: input.caseId,
          actor: input.actor,
          outcome: "success",
          duration_ms: Date.now() - sagaStartedAt,
          metric_name: "tax_plan_cycle.present_to_client_saga.duration_ms",
          metric_value: Date.now() - sagaStartedAt,
          metric_unit: "Milliseconds",
        });
      }

      if (options.queueCacheInvalidator) {
        // Cache invalidation is best-effort because Redis is disposable state.
        try {
          await options.queueCacheInvalidator.invalidateAfterStageChange({
            tenantId: input.tenantId,
            caseId: input.caseId,
          });
        } catch {
          // Ignore cache invalidation failures so the mutation still succeeds.
        }
      }

      emitObservabilityEvent(telemetryLogger, "info", "transition completed", {
        service: "core-case-service",
        layer: "workflow",
        operation: "transition",
        tenant_id: input.tenantId,
        case_id: input.caseId,
        outcome: "success",
        duration_ms: Date.now() - startedAt,
        metric_name: "tax_plan_cycle.transition.duration_ms",
        metric_value: Date.now() - startedAt,
        metric_unit: "Milliseconds",
      });

      return transitioned;
    },
    findByCaseId: (input) => repository.findByCaseId(input),
  };
}
