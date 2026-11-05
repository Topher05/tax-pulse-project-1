import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type * as z from "zod";

import { ProblemHttpError } from "../../platform/http/errors.js";
import {
  incomeEventCreateSchema,
  incomeEventReadParamsSchema,
  incomeEventRowSchema,
  incomeEventRowsSchema,
} from "./incomeEvents.js";
import type { IncomeEventService } from "./service.js";

interface TenantScopedRequest extends Request {
  tenant?: {
    id: string;
  };
  user?: {
    id: string;
  };
}

export interface CreateIncomeEventsRouterOptions {
  service: IncomeEventService;
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

function toValidationIssue(issue: Pick<z.core.$ZodIssue, "path" | "message" | "code">) {
  return {
    path: issue.path.map((segment) => (typeof segment === "number" ? segment : String(segment))),
    message: issue.message,
    code: issue.code,
  };
}

function validationError(
  detail: string,
  issues: Pick<z.core.$ZodIssue, "path" | "message" | "code">[],
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
  service,
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
        const payload = await service.listByCase({
          tenantId: tenant.id,
          caseId: parsedParams.data.caseId,
        });

        if (!payload) {
          next(taxPlanCycleNotFound());
          return;
        }

        res.status(200).json(incomeEventRowsSchema.parse(payload));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
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

      const parsedBody = incomeEventCreateSchema.safeParse(req.body);

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
        const created = await service.create({
          tenantId: tenant.id,
          caseId: parsedParams.data.caseId,
          ...parsedBody.data,
        });

        if (!created) {
          next(taxPlanCycleNotFound());
          return;
        }

        res.status(201).json(incomeEventRowSchema.parse(created));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
