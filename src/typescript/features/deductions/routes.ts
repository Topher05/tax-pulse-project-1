import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { ZodIssue } from "zod";

import { ProblemHttpError } from "../../errors.js";
import {
  clientDeductionAggregationPayloadSchema,
  deductionReadParamsSchema,
} from "./deductionAggregation.js";
import type { DeductionController } from "./controllers/deductions.js";

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
  controller?: DeductionController;
}

export function createDeductionsRouter(
  options: CreateDeductionsRouterOptions = {},
): Router {
  const router = Router();
  const controller = options.controller;

  router.get(
    "/clients/:clientId/deductions",
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
        if (controller === undefined) {
          next(
            new ProblemHttpError({
              type: "https://taxpulse.example/problems/client-deductions-not-found",
              title: "Client Deductions Not Found",
              status: 404,
              detail: "No deductions payload was found for the requested client ID.",
            }),
          );
          return;
        }

        const payload = await controller.read({
          clientId: parsedParams.data.clientId,
        });

        res.status(200).json(clientDeductionAggregationPayloadSchema.parse(payload));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
