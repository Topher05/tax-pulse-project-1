import type { TaxPlanCycle } from "./taxPlanCycle.js";
import type {
  TaxPlanCycleReadInput,
  TaxPlanCycleRepository,
  TaxPlanCycleTransitionInput,
} from "./taxPlanCycleRepository.js";
import type { TaxPlanCycleQueueCacheInvalidator } from "./taxPlanCycleQueueCache.js";

export interface TaxPlanCycleTransitionController {
  transition(
    input: TaxPlanCycleTransitionInput,
  ): Promise<TaxPlanCycle | null> | TaxPlanCycle | null;
  findByCaseId(
    input: TaxPlanCycleReadInput,
  ): Promise<TaxPlanCycle | null> | TaxPlanCycle | null;
}

export interface TaxPlanCycleTransitionControllerOptions {
  queueCacheInvalidator?: TaxPlanCycleQueueCacheInvalidator;
}

export function createTaxPlanCycleTransitionController(
  repository: TaxPlanCycleRepository,
  options: TaxPlanCycleTransitionControllerOptions = {},
): TaxPlanCycleTransitionController {
  return {
    transition: async (input) => {
      const transitioned = await repository.transition(input);

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
