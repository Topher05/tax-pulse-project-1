import { z } from "zod";

import type { TaxPlanCycle, TaxPlanCycleCreateInput } from "../taxPlanCycle.js";
import type {
  TaxPlanCycleReadInput,
  TaxPlanCycleRepository,
} from "../repository/repository.js";

export const taxPlanCycleCreateResultSchema = z.object({
  case_id: z.uuid(),
});

export type TaxPlanCycleCreateResult = z.infer<
  typeof taxPlanCycleCreateResultSchema
>;

export type TaxPlanCycleCreateControllerInput = TaxPlanCycleCreateInput & {
  tenantId: string;
  actor: string;
  idempotencyKey: string;
};

export interface TaxPlanCycleCreateController {
  create(
    input: TaxPlanCycleCreateControllerInput,
  ): TaxPlanCycleCreateResult | Promise<TaxPlanCycleCreateResult>;
  findByCaseId(
    input: TaxPlanCycleReadInput,
  ): TaxPlanCycle | null | Promise<TaxPlanCycle | null>;
}

export function createTaxPlanCycleCreateController(
  repository: TaxPlanCycleRepository,
): TaxPlanCycleCreateController {
  return {
    async create(input) {
      const caseId = await repository.create({
        tenantId: input.tenantId,
        planningPeriod: input.planning_period,
        clientId: input.client_id,
        owner: input.owner,
        priority: input.priority,
        dueDate: input.due_date,
        actor: input.actor,
        idempotencyKey: input.idempotencyKey,
      });

      return { case_id: caseId };
    },
    findByCaseId: (input) => repository.findByCaseId(input),
  };
}

export const taxPlanCycleCreateController: TaxPlanCycleCreateController = {
  create: () => ({ case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01" }),
  findByCaseId: () => null,
};
