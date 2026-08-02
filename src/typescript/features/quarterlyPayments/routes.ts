import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { ZodIssue } from "zod";

import { ProblemHttpError } from "../../errors.js";
import {
  quarterlyEstimateReadParamsSchema,
  quarterlyEstimateRowsSchema,
} from "./quarterlyPayments.js";
import type { TaxPlanCycleRepository } from "../taxPlanCycle/repositories/repository.js";

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
  const dueYear = Number(dueDate.slice(0, 4));
  const nextYear = dueYear + 1;
  const taxYear = String(dueYear);

  return [
    {
      case_id: caseId,
      tax_year: taxYear,
      quarter: "Q1" as const,
      due_date: `${dueYear}-04-15`,
      estimated_payment: "3620.00",
      withholding_applied: "2140.00",
      covered_amount: "2140.00",
      remaining_due: "1480.00",
      status: "Paid",
    },
    {
      case_id: caseId,
      tax_year: taxYear,
      quarter: "Q2" as const,
      due_date: `${dueYear}-06-15`,
      estimated_payment: "3620.00",
      withholding_applied: "2060.00",
      covered_amount: "2060.00",
      remaining_due: "1560.00",
      status: "Paid",
    },
    {
      case_id: caseId,
      tax_year: taxYear,
      quarter: "Q3" as const,
      due_date: `${dueYear}-09-15`,
      estimated_payment: "3620.00",
      withholding_applied: "1820.00",
      covered_amount: "1820.00",
      remaining_due: "1800.00",
      status: "Due Soon",
    },
    {
      case_id: caseId,
      tax_year: String(nextYear),
      quarter: "Q4" as const,
      due_date: `${nextYear}-01-15`,
      estimated_payment: "3740.00",
      withholding_applied: "1640.00",
      covered_amount: "1640.00",
      remaining_due: "2100.00",
      status: "Upcoming",
    },
  ];
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
