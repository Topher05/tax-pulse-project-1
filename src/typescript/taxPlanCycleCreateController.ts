import { z } from "zod";

import type { TaxPlanCycle, TaxPlanCycleCreateInput } from "./taxPlanCycle.js";
import type { TaxPlanCycleReadInput } from "./taxPlanCycleRepository.js";

export const taxPlanCycleCreateResultSchema = z.object({
  accepted: z.literal(true),
});

export type TaxPlanCycleCreateResult = z.infer<
  typeof taxPlanCycleCreateResultSchema
>;

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
