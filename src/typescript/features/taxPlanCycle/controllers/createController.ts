import { z } from "zod";

import { ProblemHttpError } from "../../../platform/http/errors.js";
import type {
  TaxPlanCycle,
  TaxPlanCycleCreateInput,
} from "../taxPlanCycle.js";
import type { TaxpayerIdentifierValidator } from "../infrastructure/tinEinValidationAcl.js";
import {
  TaxPlanCycleCreateIdempotencyInProgressError,
  TaxPlanCycleCreateIdempotencyUnavailableError,
  createUnavailableTaxPlanCycleCreateIdempotencyStore,
  type TaxPlanCycleCreateIdempotencyStore,
} from "../infrastructure/createIdempotency.js";
import type {
  TaxpayerIdentifierValidationRepository,
} from "../repositories/taxpayerIdentifierValidation.js";
import {
  isTaxpayerIdentifierSoapFaultError,
  type TaxpayerIdentifierType,
  type TaxpayerIdentifierValidation,
} from "../taxpayerIdentifierValidation.js";
import type {
  TaxPlanCycleReadInput,
  TaxPlanCycleRepository,
  TaxPlanCycleRepositoryCreateInput,
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

export type TaxPlanCycleCreateControllerReadResult = TaxPlanCycle & {
  taxpayer_identifier_validation?: TaxpayerIdentifierValidation;
};

export interface TaxPlanCycleCreateController {
  create(
    input: TaxPlanCycleCreateControllerInput,
  ): TaxPlanCycleCreateResult | Promise<TaxPlanCycleCreateResult>;
  findByCaseId(
    input: TaxPlanCycleReadInput,
  ):
    | TaxPlanCycleCreateControllerReadResult
    | null
    | Promise<TaxPlanCycleCreateControllerReadResult | null>;
}

export interface CreateTaxPlanCycleCreateControllerOptions {
  idempotencyStore?: TaxPlanCycleCreateIdempotencyStore;
  taxpayerIdentifierValidator?: TaxpayerIdentifierValidator;
  taxpayerIdentifierValidationRepository?: TaxpayerIdentifierValidationRepository;
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

function createTaxpayerIdentifierValidationUnavailableProblem(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/taxpayer-identifier-validation-unavailable",
    title: "Taxpayer Identifier Validation Unavailable",
    status: 503,
    detail: "TIVS validation is required when taxpayer identifier input is provided.",
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
            if (
              input.taxpayer_identifier &&
              (!options.taxpayerIdentifierValidator ||
                !options.taxpayerIdentifierValidationRepository)
            ) {
              throw createTaxpayerIdentifierValidationUnavailableProblem();
            }

            let taxpayerIdentifierValidation:
              | TaxPlanCycleRepositoryCreateInput["taxpayerIdentifierValidation"]
              | undefined;

            if (
              input.taxpayer_identifier &&
              options.taxpayerIdentifierValidator
            ) {
              try {
                const validation =
                  await options.taxpayerIdentifierValidator.validateTaxpayerIdentifier(
                    input.taxpayer_identifier,
                  );

                taxpayerIdentifierValidation = {
                  tinType: validation.tinType,
                  validationResult: validation.result,
                  ...(validation.verifiedName
                    ? { verifiedName: validation.verifiedName }
                    : {}),
                  provider: validation.provider,
                };
              } catch (error) {
                if (isTaxpayerIdentifierSoapFaultError(error)) {
                  taxpayerIdentifierValidation = {
                    tinType:
                      input.taxpayer_identifier.tin_type.toLowerCase() as TaxpayerIdentifierType,
                    validationResult: "soap_fault",
                    provider: "tivs",
                  };
                } else {
                  throw error;
                }
              }
            }

            const caseId = await repository.create({
              tenantId: input.tenantId,
              planningPeriod: input.planning_period,
              clientId: input.client_id,
              owner: input.owner,
              priority: input.priority,
              dueDate: input.due_date,
              actor: input.actor,
              ...(taxpayerIdentifierValidation
                ? { taxpayerIdentifierValidation }
                : {}),
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
    async findByCaseId(input) {
      const cycle = await repository.findByCaseId(input);

      if (!cycle) {
        return null;
      }

      const validation =
        await options.taxpayerIdentifierValidationRepository?.findByCaseId(input);

      return {
        ...cycle,
        ...(validation
          ? { taxpayer_identifier_validation: validation }
          : {}),
      };
    },
  };
}

export const taxPlanCycleCreateController: TaxPlanCycleCreateController = {
  create: () => ({ case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01" }),
  findByCaseId: () => null,
};
