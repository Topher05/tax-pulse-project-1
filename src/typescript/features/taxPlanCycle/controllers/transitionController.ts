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
} from "../actionItemCreatedEvent.js";

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
}

export function createTaxPlanCycleTransitionController(
  repository: TaxPlanCycleRepository,
  options: TaxPlanCycleTransitionControllerOptions = {},
): TaxPlanCycleTransitionController {
  const eventLogger = options.stageChangedEventLogger ?? console;

  return {
    transition: async (input) => {
      const transitioned = await repository.transition(input);
      if (!transitioned) {
        return null;
      }

      if (options.stageChangedEventPublisher) {
        // Event publishing is best-effort because the database transition already committed.
        try {
          await options.stageChangedEventPublisher.publishStageChanged({
            tenantId: input.tenantId,
            caseId: input.caseId,
            fromStage: input.fromStage,
            toStage: input.toStage,
            actor: input.actor,
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

      return transitioned;
    },
    findByCaseId: (input) => repository.findByCaseId(input),
  };
}

/** @deprecated Legacy fallback stub. Inject a real repository-backed controller instead. */
export const taxPlanCycleTransitionController: TaxPlanCycleTransitionController =
  {
    transition: () => null,
    findByCaseId: () => null,
  };
