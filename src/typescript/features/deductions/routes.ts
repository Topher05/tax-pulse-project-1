import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { ZodIssue } from "zod";

import { ProblemHttpError } from "../../errors.js";
import {
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

  return router;
}
