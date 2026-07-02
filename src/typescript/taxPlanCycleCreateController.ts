import type { TaxPlanCycleCreateInput } from "./taxPlanCycle.js";

export interface TaxPlanCycleCreateResult {
  accepted: true;
}

export interface TaxPlanCycleCreateController {
  create(
    input: TaxPlanCycleCreateInput,
  ): TaxPlanCycleCreateResult | Promise<TaxPlanCycleCreateResult>;
}

export const taxPlanCycleCreateController: TaxPlanCycleCreateController = {
  create: () => ({ accepted: true }),
};
