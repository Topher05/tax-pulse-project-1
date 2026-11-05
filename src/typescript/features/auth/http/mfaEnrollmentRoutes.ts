import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type * as z from "zod";

import { ProblemHttpError, type ProblemDetails } from "../../../platform/http/errors.js";
import {
  createMfaEnrollmentController,
  mfaEnrollConfirmRequestSchema,
  mfaEnrollRequestSchema,
  type MfaEnrollConfirmRequest,
  type MfaEnrollRequest,
  type MfaEnrollmentController,
} from "../application/mfaEnrollment.js";

export interface CreateMfaEnrollmentRouterOptions {
  controller?: MfaEnrollmentController;
}

export interface MfaValidationErrorIssue {
  path: Array<string | number>;
  message: string;
  code: string;
}

export interface MfaValidationErrorResponse extends ProblemDetails {
  code: "VALIDATION_ERROR";
  issues: MfaValidationErrorIssue[];
}

interface AuthenticatedTenantRequest extends Request {
  tenant?: {
    id: string;
  };
  user?: {
    id: string;
  };
}

function toValidationIssue(issue: z.core.$ZodIssue): MfaValidationErrorIssue {
  return {
    path: issue.path.map((segment) =>
      typeof segment === "number" ? segment : String(segment),
    ),
    message: issue.message,
    code: issue.code,
  };
}

function validationError(input: {
  detail: string;
  issues: z.core.$ZodIssue[];
}): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/validation-error",
    title: "Validation Error",
    status: 400,
    detail: input.detail,
    extensions: {
      code: "VALIDATION_ERROR",
      issues: input.issues.map(toValidationIssue),
    },
  });
}

function getAuthenticatedContext(
  req: Request,
  body: MfaEnrollRequest | MfaEnrollConfirmRequest,
): {
  tenantId: string;
  userId: string;
} {
  const request = req as AuthenticatedTenantRequest;
  const tenantId = body.tenant_id ?? request.tenant?.id;
  const userId = body.user_id ?? request.user?.id;

  if (!tenantId || !userId) {
    throw new ProblemHttpError({
      type: "https://taxpulse.example/problems/authentication-required",
      title: "Authentication Required",
      status: 401,
      detail: "An authenticated tenant and user context is required.",
    });
  }

  return { tenantId, userId };
}

export function createMfaEnrollmentRouter(
  options: CreateMfaEnrollmentRouterOptions = {},
): Router {
  const router = Router();
  const controller =
    options.controller ??
    createMfaEnrollmentController({
      repository: {
        findTenantUser: async () => null,
        findEnrollment: async () => null,
        savePendingEnrollment: async () => undefined,
        markEnrolled: async () => undefined,
      },
    });

  router.post(
    "/mfa/enroll",
    async (req: Request, res: Response, next: NextFunction) => {
      const parsedBody = mfaEnrollRequestSchema.safeParse(req.body ?? {});

      if (!parsedBody.success) {
        next(
          validationError({
            detail: "Request body failed validation.",
            issues: parsedBody.error.issues,
          }),
        );
        return;
      }

      try {
        const context = getAuthenticatedContext(req, parsedBody.data);
        const result = await controller.enroll(context);

        res.status(202).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/mfa/enroll/confirm",
    async (req: Request, res: Response, next: NextFunction) => {
      const parsedBody = mfaEnrollConfirmRequestSchema.safeParse(req.body);

      if (!parsedBody.success) {
        next(
          validationError({
            detail: "Request body failed validation.",
            issues: parsedBody.error.issues,
          }),
        );
        return;
      }

      try {
        const context = getAuthenticatedContext(req, parsedBody.data);
        const result = await controller.confirm({
          ...context,
          code: parsedBody.data.code,
        });

        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
