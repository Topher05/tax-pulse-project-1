import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { ZodIssue } from "zod";

import { ProblemHttpError } from "../../errors.js";
import {
  deductionCreateSchema,
  deductionTableRowSchema,
  deductionTableRowsSchema,
  deductionReadParamsSchema,
} from "./repositories/deduction.js";
import type { DeductionRepository } from "./repositories/repository.js";

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

function taxPlanCycleNotFound(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
    title: "Tax Plan Cycle Not Found",
    status: 404,
    detail: "No tax plan cycle was found for the requested case ID.",
  });
}

export interface CreateDeductionsRouterOptions {
  repository: DeductionRepository;
}

export function createDeductionsRouter(
  options: CreateDeductionsRouterOptions,
): Router {
  const router = Router();
  const repository = options.repository;

  router.get(
    "/cases/:caseId/deductions",
    async (req: Request, res: Response, next: NextFunction) => {
      const parsedParams = deductionReadParamsSchema.safeParse(req.params);

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
        const deductions = await repository.listByCase({
          tenantId: tenant.id,
          caseId: parsedParams.data.caseId,
        });

        res.status(200).json(deductionTableRowsSchema.parse(deductions));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/cases/:caseId/deductions",
    async (req: Request, res: Response, next: NextFunction) => {
      const parsedParams = deductionReadParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        next(
          validationError(
            "Request path parameters failed validation.",
            parsedParams.error.issues,
          ),
        );
        return;
      }

      const parsedBody = deductionCreateSchema.safeParse(req.body);

      if (!parsedBody.success) {
        next(validationError("Request body failed validation.", parsedBody.error.issues));
        return;
      }

      const tenant = (req as TenantScopedRequest).tenant;
      const user = (req as TenantScopedRequest).user;

      if (!tenant?.id || !user?.id) {
        next(authenticationRequired());
        return;
      }

      try {
        const deduction = await repository.create({
          tenantId: tenant.id,
          caseId: parsedParams.data.caseId,
          ...parsedBody.data,
        });

        if (!deduction) {
          next(taxPlanCycleNotFound());
          return;
        }

        res.status(201).json(deductionTableRowSchema.parse(deduction));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
