import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { ZodIssue } from "zod";

import {
  taxPlanCycleCreateController,
  type TaxPlanCycleCreateController,
} from "./taxPlanCycleCreateController.js";
import { ProblemHttpError, type ProblemDetails } from "./errors.js";
import { taxPlanCycleCreateSchema } from "./taxPlanCycle.js";

export interface ValidationErrorIssue {
  path: Array<string | number>;
  message: string;
  code: string;
}

export interface ValidationErrorResponse extends ProblemDetails {
  code: "VALIDATION_ERROR";
  issues: ValidationErrorIssue[];
}

export interface CreateTaxPlanCycleRouterOptions {
  controller?: TaxPlanCycleCreateController;
}

function toValidationIssue(issue: ZodIssue): ValidationErrorIssue {
  return {
    path: issue.path.map((segment) =>
      typeof segment === "number" ? segment : String(segment),
    ),
    message: issue.message,
    code: issue.code,
  };
}

export function createTaxPlanCycleRouter(
  options: CreateTaxPlanCycleRouterOptions = {},
): Router {
  const router = Router();
  const controller = options.controller ?? taxPlanCycleCreateController;

  router.post(
    "/tax-plan-cycles",
    async (req: Request, res: Response, next: NextFunction) => {
      const parsedBody = taxPlanCycleCreateSchema.safeParse(req.body);

      if (!parsedBody.success) {
        next(
          new ProblemHttpError({
            type: "https://taxpulse.example/problems/validation-error",
            title: "Validation Error",
            status: 400,
            detail: "Request body failed validation.",
            extensions: {
              code: "VALIDATION_ERROR",
              issues: parsedBody.error.issues.map(toValidationIssue),
            },
          }),
        );
        return;
      }

      try {
        const result = await controller.create(parsedBody.data);
        res.status(202).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
