import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { ZodIssue } from "zod";

import { ProblemHttpError } from "../../errors.js";
import type { TaxPlanCycleRepository } from "../taxPlanCycle/repositories/repository.js";
import { buildIncomeEventMockRows } from "./mockIncomeEvents.model.js";
import {
  incomeEventReadParamsSchema,
  incomeEventRowsSchema,
} from "./incomeEvents.js";

interface TenantScopedRequest extends Request {
  tenant?: {
    id: string;
  };
  user?: {
    id: string;
  };
}

export interface CreateIncomeEventsRouterOptions {
  taxPlanCycleRepository: Pick<TaxPlanCycleRepository, "findByCaseId">;
}

function authenticationRequired(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/authentication-required",
    title: "Authentication Required",
    status: 401,
    detail: "A valid access token is required.",
  });
}

function taxPlanCycleNotFound(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
    title: "Tax Plan Cycle Not Found",
    status: 404,
    detail: "No tax plan cycle was found for the requested case ID.",
  });
}

function toValidationIssue(issue: Pick<ZodIssue, "path" | "message" | "code">) {
  return {
    path: issue.path.map((segment) => (typeof segment === "number" ? segment : String(segment))),
    message: issue.message,
    code: issue.code,
  };
}

function validationError(
  detail: string,
  issues: Pick<ZodIssue, "path" | "message" | "code">[],
) {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/validation-error",
    title: "Validation Error",
    status: 400,
    detail,
    extensions: {
      code: "VALIDATION_ERROR",
      issues: issues.map(toValidationIssue),
    },
  });
}

export function createIncomeEventsRouter({
  taxPlanCycleRepository,
}: CreateIncomeEventsRouterOptions): Router {
  const router = Router();

  router.get(
    "/cases/:caseId/income-events",
    async (req: Request, res: Response, next: NextFunction) => {
      const parsedParams = incomeEventReadParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        next(
          validationError(
            "Request path parameters failed validation.",
            parsedParams.error.issues,
          ),
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
        const cycle = await taxPlanCycleRepository.findByCaseId({
          tenantId: tenant.id,
          caseId: parsedParams.data.caseId,
        });

        if (!cycle) {
          next(taxPlanCycleNotFound());
          return;
        }

        const payload = buildIncomeEventMockRows({
          caseId: cycle.id,
          dueDate: cycle.due_date,
        });

        res.status(200).json(incomeEventRowsSchema.parse(payload));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

