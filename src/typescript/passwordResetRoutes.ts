import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { ZodIssue } from "zod";

import { ProblemHttpError, type ProblemDetails } from "./errors.js";
import {
  InvalidResetTokenError,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
} from "./passwordReset.js";
import type { PasswordResetService } from "./passwordResetService.js";
import { parseTenantLoginHostname } from "./tenantLoginHost.js";
import type { TenantLoginResolver } from "./tenantLoginResolver.js";

export interface CreatePasswordResetRouterOptions {
  service: PasswordResetService;
  tenantLoginResolver: TenantLoginResolver;
  tenantLoginBaseDomain?: string;
}

interface PasswordResetValidationErrorIssue {
  path: Array<string | number>;
  message: string;
  code: string;
}

export interface PasswordResetValidationErrorResponse extends ProblemDetails {
  code: "VALIDATION_ERROR";
  issues: PasswordResetValidationErrorIssue[];
}

function toValidationIssue(issue: ZodIssue): PasswordResetValidationErrorIssue {
  return {
    path: issue.path.map((segment) =>
      typeof segment === "number" ? segment : String(segment),
    ),
    message: issue.message,
    code: issue.code,
  };
}

export function createPasswordResetRouter({
  service,
  tenantLoginResolver,
  tenantLoginBaseDomain,
}: CreatePasswordResetRouterOptions): Router {
  const router = Router();

  router.post(
    "/auth/forgot-password",
    async (req: Request, res: Response, next: NextFunction) => {
      const parsedBody = forgotPasswordRequestSchema.safeParse(req.body);

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
        const loginSlug = parseTenantLoginHostname(req.hostname, {
          baseDomain: tenantLoginBaseDomain,
        });
        if (!loginSlug) {
          res.status(202).json({ accepted: true });
          return;
        }

        const tenant = await tenantLoginResolver.findActiveTenantByLoginSlug(loginSlug);
        if (!tenant) {
          res.status(202).json({ accepted: true });
          return;
        }

        await service.requestReset(tenant.tenantId, parsedBody.data.email);
        res.status(202).json({ accepted: true });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/auth/reset-password",
    async (req: Request, res: Response, next: NextFunction) => {
      const parsedBody = resetPasswordRequestSchema.safeParse(req.body);

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
        await service.confirmReset(parsedBody.data.token, parsedBody.data.new_password);
        res.status(200).json({ reset: true });
      } catch (error) {
        if (error instanceof InvalidResetTokenError) {
          next(
            new ProblemHttpError({
              type: "https://taxpulse.example/problems/invalid-reset-token",
              title: "Invalid Reset Token",
              status: 401,
              detail: "The reset token is invalid or has expired.",
            }),
          );
          return;
        }

        next(error);
      }
    },
  );

  return router;
}
