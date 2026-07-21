import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { ZodIssue } from "zod";

import {
  authMfaLoginRequestSchema,
  type AuthMfaLoginController,
} from "./authMfaLogin.js";
import { ProblemHttpError, type ProblemDetails } from "./errors.js";

export interface CreateAuthMfaLoginRouterOptions {
  controller: AuthMfaLoginController;
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

function toValidationIssue(issue: ZodIssue): AuthMfaValidationErrorIssue {
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
  issues: ZodIssue[];
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
}: CreateAuthMfaLoginRouterOptions): Router {
  const router = Router();

  router.post(
    "/auth/login/mfa",
    async (req: Request, res: Response, next: NextFunction) => {
      console.log("Reached MFA endpoint")
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

        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
