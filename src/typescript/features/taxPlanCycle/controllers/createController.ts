import { z } from "zod";

import { ProblemHttpError } from "../../../errors.js";
import type { TaxPlanCycle, TaxPlanCycleCreateInput } from "../taxPlanCycle.js";
import {
  TaxPlanCycleCreateIdempotencyInProgressError,
  TaxPlanCycleCreateIdempotencyUnavailableError,
  createUnavailableTaxPlanCycleCreateIdempotencyStore,
  type TaxPlanCycleCreateIdempotencyStore,
} from "../infrastructure/createIdempotency.js";
import type {
  TaxPlanCycleReadInput,
  TaxPlanCycleRepository,
} from "../repositories/repository.js";

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

export interface CreateTaxPlanCycleCreateControllerOptions {
  idempotencyStore?: TaxPlanCycleCreateIdempotencyStore;
}

function createIdempotencyUnavailableProblem(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/idempotency-store-unavailable",
    title: "Idempotency Store Unavailable",
    status: 503,
    detail: "Redis idempotency storage is required to create a Tax Plan Cycle.",
  });
}

function createIdempotencyInProgressProblem(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/idempotency-request-in-progress",
    title: "Idempotency Request In Progress",
    status: 409,
    detail: "A create request with the same Idempotency-Key is still in progress.",
  });
}

export function createTaxPlanCycleCreateController(
  repository: TaxPlanCycleRepository,
  options: CreateTaxPlanCycleCreateControllerOptions = {},
): TaxPlanCycleCreateController {
  const idempotencyStore =
    options.idempotencyStore ?? createUnavailableTaxPlanCycleCreateIdempotencyStore();

  return {
    async create(input) {
      try {
        return await idempotencyStore.run(
          {
            tenantId: input.tenantId,
            idempotencyKey: input.idempotencyKey,
          },
          async () => {
            const caseId = await repository.create({
              tenantId: input.tenantId,
              planningPeriod: input.planning_period,
              clientId: input.client_id,
              owner: input.owner,
              priority: input.priority,
              dueDate: input.due_date,
              actor: input.actor,
            });

            return { case_id: caseId };
          },
        );
      } catch (error) {
        if (error instanceof TaxPlanCycleCreateIdempotencyUnavailableError) {
          throw createIdempotencyUnavailableProblem();
        }

        if (error instanceof TaxPlanCycleCreateIdempotencyInProgressError) {
          throw createIdempotencyInProgressProblem();
        }

        throw error;
      }
    },
    findByCaseId: (input) => repository.findByCaseId(input),
  };
}

export const taxPlanCycleCreateController: TaxPlanCycleCreateController = {
  create: () => ({ case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01" }),
  findByCaseId: () => null,
};
