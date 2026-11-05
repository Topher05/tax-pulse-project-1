import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type * as z from "zod";

import {
  authMfaLoginRequestSchema,
  type AuthMfaLoginController,
} from "../application/authMfaLogin.js";
import { ProblemHttpError, type ProblemDetails } from "../../../platform/http/errors.js";
import { setRefreshTokenCookie } from "./authSessionCookies.js";

export interface CreateAuthMfaLoginRouterOptions {
  controller: AuthMfaLoginController;
  secureCookies?: boolean;
}

export interface AuthMfaValidationErrorIssue {
  path: Array<string | number>;
  message: string;
  code: string;
}

export interface AuthMfaValidationErrorResponse extends ProblemDetails {
  code: "VALIDATION_ERROR";
  issues: AuthMfaValidationErrorIssue[];
}

function toValidationIssue(issue: z.core.$ZodIssue): AuthMfaValidationErrorIssue {
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

export function createAuthMfaLoginRouter({
  controller,
  secureCookies = true,
}: CreateAuthMfaLoginRouterOptions): Router {
  const router = Router();

  router.post(
    "/auth/login/mfa",
    async (req: Request, res: Response, next: NextFunction) => {
      const parsedBody = authMfaLoginRequestSchema.safeParse(req.body);

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
        const result = await controller.verify(parsedBody.data);

        setRefreshTokenCookie(res, result.refresh_token, result.refresh_expires_in, {
          secure: secureCookies,
        });
        res.status(200).json({
          access_token: result.access_token,
          token_type: result.token_type,
          expires_in: result.expires_in,
          refresh_expires_in: result.refresh_expires_in,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
