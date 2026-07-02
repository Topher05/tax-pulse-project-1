import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { ZodIssue } from "zod";

import {
  taxPlanCycleCreateController,
  type TaxPlanCycleCreateController,
} from "./taxPlanCycleCreateController.js";
import { taxPlanCycleCreateSchema } from "./taxPlanCycle.js";

export interface ValidationErrorIssue {
  path: Array<string | number>;
  message: string;
  code: string;
}

export interface ValidationErrorResponse {
  error: {
    code: "VALIDATION_ERROR";
    message: "Request body failed validation";
    issues: ValidationErrorIssue[];
  };
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

function toValidationErrorResponse(issues: ZodIssue[]): ValidationErrorResponse {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: "Request body failed validation",
      issues: issues.map(toValidationIssue),
    },
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
        res.status(400).json(toValidationErrorResponse(parsedBody.error.issues));
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
