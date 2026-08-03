import type { TaxPlanCycle } from "../taxPlanCycle.js";
import type {
  TaxPlanCycleReadInput,
  TaxPlanCycleRepository,
  TaxPlanCycleTransitionInput,
} from "../repositories/repository.js";
import type { TaxPlanCycleQueueCacheInvalidator } from "../infrastructure/queueCache.js";
import type { StageChangedEventPublishInput } from "../stageChangedEvent.js";

export interface StageChangedEventPublisher {
  publishStageChanged(
    input: StageChangedEventPublishInput,
  ): Promise<void> | void;
}

export interface TaxPlanCycleTransitionControllerInput
  extends TaxPlanCycleTransitionInput {
  fromStage: TaxPlanCycle["stage"];
}

export interface TaxPlanCycleTransitionController {
  transition(
    input: TaxPlanCycleTransitionControllerInput,
  ): Promise<TaxPlanCycle | null> | TaxPlanCycle | null;
  findByCaseId(
    input: TaxPlanCycleReadInput,
  ): Promise<TaxPlanCycle | null> | TaxPlanCycle | null;
}

export interface TaxPlanCycleTransitionControllerOptions {
  queueCacheInvalidator?: TaxPlanCycleQueueCacheInvalidator;
  stageChangedEventPublisher?: StageChangedEventPublisher;
}

export function createTaxPlanCycleTransitionController(
  repository: TaxPlanCycleRepository,
  options: TaxPlanCycleTransitionControllerOptions = {},
): TaxPlanCycleTransitionController {
  return {
    transition: async (input) => {
      const transitioned = await repository.transition(input);

      if (transitioned && options.stageChangedEventPublisher) {
        await options.stageChangedEventPublisher.publishStageChanged({
          tenantId: input.tenantId,
          caseId: input.caseId,
          fromStage: input.fromStage,
          toStage: input.toStage,
          actor: input.actor,
        });
      }

      if (transitioned && options.queueCacheInvalidator) {
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
