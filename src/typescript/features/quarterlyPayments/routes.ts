import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { ZodIssue } from "zod";

import { ProblemHttpError } from "../../errors.js";
import {
  quarterlyEstimateRowsSchema,
  quarterlyEstimateReadParamsSchema,
} from "./repositories/quarterlyPayments.js";
import type { TaxPlanCycleRepository } from "../taxPlanCycle/repositories/repository.js";
import { buildQuarterlyEstimateMockRows } from "./repositories/mockPayments.model.js";

interface TenantScopedRequest extends Request {
  tenant?: {
    id: string;
  };
  user?: {
    id: string;
  };
}

function authenticationRequired(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/authentication-required",
    title: "Authentication Required",
    status: 401,
    detail: "A valid access token is required.",
  });
}

function toValidationIssue(issue: Pick<ZodIssue, "path" | "message" | "code">) {
  return {
    path: issue.path.map((segment) => (typeof segment === "number" ? segment : String(segment))),
    message: issue.message,
    code: issue.code,
  };
}

export interface CreateQuarterlyPaymentsRouterOptions {
  taxPlanCycleRepository: Pick<TaxPlanCycleRepository, "findByCaseId">;
}

function buildQuarterlyEstimates(caseId: string, dueDate: string) {
  return buildQuarterlyEstimateMockRows({
    caseId,
    dueDate,
  });
}

export function createQuarterlyPaymentsRouter(
  options: CreateQuarterlyPaymentsRouterOptions,
): Router {
  const router = Router();

  router.get(
    "/tax-plan-cycles/:caseId/quarterly-estimates",
    async (req: Request, res: Response, next: NextFunction) => {
      const parsedParams = quarterlyEstimateReadParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        next(
          new ProblemHttpError({
            type: "https://taxpulse.example/problems/validation-error",
            title: "Validation Error",
            status: 400,
            detail: "Request path parameters failed validation.",
            extensions: {
              code: "VALIDATION_ERROR",
              issues: parsedParams.error.issues.map(toValidationIssue),
            },
          }),
        );
        return;
      }

      const tenant = (req as TenantScopedRequest).tenant;
      const user = (req as TenantScopedRequest).user;

      if (!tenant?.id || !user?.id) {
        next(authenticationRequired());
        return;
      }

      try {
        const cycle = await options.taxPlanCycleRepository.findByCaseId({
          tenantId: tenant.id,
          caseId: parsedParams.data.caseId,
        });

        if (!cycle) {
          next(
            new ProblemHttpError({
              type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
              title: "Tax Plan Cycle Not Found",
              status: 404,
              detail: "No tax plan cycle was found for the requested case ID.",
            }),
          );
          return;
        }

        const payload = buildQuarterlyEstimates(cycle.id, cycle.due_date);
        res.status(200).json(quarterlyEstimateRowsSchema.parse(payload));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
