import type { TaxPlanCycle } from "./taxPlanCycle.js";
import type {
  TaxPlanCycleReadInput,
  TaxPlanCycleRepository,
  TaxPlanCycleTransitionInput,
} from "./taxPlanCycleRepository.js";

export interface TaxPlanCycleTransitionController {
  transition(
    input: TaxPlanCycleTransitionInput,
  ): Promise<TaxPlanCycle | null> | TaxPlanCycle | null;
  findByCaseId(
    input: TaxPlanCycleReadInput,
  ): Promise<TaxPlanCycle | null> | TaxPlanCycle | null;
}

export function createTaxPlanCycleTransitionController(
  repository: TaxPlanCycleRepository,
): TaxPlanCycleTransitionController {
  return {
    transition: (input) => repository.transition(input),
    findByCaseId: (input) => repository.findByCaseId(input),
  };
}

/** @deprecated Legacy fallback stub. Inject a real repository-backed controller instead. */
export const taxPlanCycleTransitionController: TaxPlanCycleTransitionController =
  {
    transition: () => null,
    findByCaseId: () => null,
  };
