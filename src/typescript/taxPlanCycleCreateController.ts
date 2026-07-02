import type { TaxPlanCycle, TaxPlanCycleCreateInput } from "./taxPlanCycle.js";

export interface TaxPlanCycleCreateResult {
  accepted: true;
}

export interface TaxPlanCycleReadInput {
  tenantId: string;
  caseId: string;
}

export interface TaxPlanCycleCreateController {
  create(
    input: TaxPlanCycleCreateInput,
  ): TaxPlanCycleCreateResult | Promise<TaxPlanCycleCreateResult>;
  findByCaseId(
    input: TaxPlanCycleReadInput,
  ): TaxPlanCycle | null | Promise<TaxPlanCycle | null>;
}

export const taxPlanCycleCreateController: TaxPlanCycleCreateController = {
  create: () => ({ accepted: true }),
  findByCaseId: () => null,
};
