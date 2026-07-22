import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { ZodIssue } from "zod";

import {
  taxPlanCycleCreateController,
  type TaxPlanCycleCreateController,
} from "./taxPlanCycleCreateController.js";
import type { AuditEntryReader } from "./auditEntryRepository.js";
import { ProblemHttpError, type ProblemDetails } from "./errors.js";
import {
  taxPlanCycleCreateSchema,
  taxPlanCycleReadParamsSchema,
} from "./taxPlanCycle.js";

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
  auditEntryReader?: AuditEntryReader;
}

interface TenantScopedRequest extends Request {
  tenant: {
    id: string;
  };
  user?: {
    id: string;
  };
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

function getActorId(req: Request, fallbackActor: string): string {
  return (req as TenantScopedRequest).user?.id ?? fallbackActor;
}

export function createTaxPlanCycleRouter(
  options: CreateTaxPlanCycleRouterOptions = {},
): Router {
  const router = Router();
  const controller = options.controller ?? taxPlanCycleCreateController;
  const auditEntryReader = options.auditEntryReader ?? {
    listByCase: async () => [],
  };

  router.get(
    "/tax-plan-cycles/:caseId/audit-entries",
    async (req: Request, res: Response, next: NextFunction) => {
      const parsedParams = taxPlanCycleReadParamsSchema.safeParse(req.params);

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

      try {
        const tenantId = (req as TenantScopedRequest).tenant.id;
        const cycle = await controller.findByCaseId({
          tenantId,
          caseId: parsedParams.data.caseId,
        });

        if (cycle === null) {
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

        const auditEntries = await auditEntryReader.listByCase({
          tenantId,
          caseId: parsedParams.data.caseId,
        });

        res.status(200).json({ audit_entries: auditEntries });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/tax-plan-cycles/:caseId",
    async (req: Request, res: Response, next: NextFunction) => {
      const parsedParams = taxPlanCycleReadParamsSchema.safeParse(req.params);

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

      try {
        const tenantId = (req as TenantScopedRequest).tenant.id;
        const cycle = await controller.findByCaseId({
          tenantId,
          caseId: parsedParams.data.caseId,
        });

        if (cycle === null) {
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

        res.status(200).json(cycle);
      } catch (error) {
        next(error);
      }
    },
  );

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
        const tenantId = (req as TenantScopedRequest).tenant.id;
        const result = await controller.create({
          ...parsedBody.data,
          tenantId,
          actor: getActorId(req, parsedBody.data.owner),
        });
        res.status(202).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
