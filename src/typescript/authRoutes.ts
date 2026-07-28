import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z, type ZodIssue } from "zod";

import {
  type PasswordAuthenticationResult,
  type PasswordCredentialLoginInput,
  type PasswordCredentialReader,
} from "./authModel.js";
import { authenticatePasswordForMfaChallenge } from "./authService.js";
import { ProblemHttpError, type ProblemDetails } from "./errors.js";
import { parseTenantLoginHostname } from "./tenantLoginHost.js";
import type { TenantLoginResolver } from "./tenantLoginResolver.js";

export const passwordLoginRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

export interface PasswordLoginRequest {
  email: string;
  password: string;
}

export interface MfaChallengeResponse {
  status: "mfa_challenge_required";
  tenant_id: string;
  email: string;
  user_id: string;
}

export interface AuthValidationErrorIssue {
  path: Array<string | number>;
  message: string;
  code: string;
}

export interface AuthValidationErrorResponse extends ProblemDetails {
  code: "VALIDATION_ERROR";
  issues: AuthValidationErrorIssue[];
}

export type PasswordAuthenticator = (
  input: PasswordCredentialLoginInput,
) => Promise<PasswordAuthenticationResult>;

export interface CreateAuthRouterOptions {
  tenantLoginResolver: TenantLoginResolver;
  tenantLoginBaseDomain?: string;
  credentialReader?: PasswordCredentialReader;
  authenticatePassword?: PasswordAuthenticator;
}

function toValidationIssue(issue: ZodIssue): AuthValidationErrorIssue {
  return {
    path: issue.path.map((segment) =>
      typeof segment === "number" ? segment : String(segment),
    ),
    message: issue.message,
    code: issue.code,
  };
}

function toLoginInput(
  body: PasswordLoginRequest,
  tenantId: string,
): PasswordCredentialLoginInput {
  return {
    tenantId,
    email: body.email,
    plaintextPassword: body.password,
  };
}

function toMfaChallengeResponse(
  result: Extract<PasswordAuthenticationResult, { status: "mfa_challenge_required" }>,
): MfaChallengeResponse {
  return {
    status: result.status,
    tenant_id: result.tenantId,
    email: result.email,
    user_id: result.userId,
  };
}

function invalidCredentialsError(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/invalid-credentials",
    title: "Invalid Credentials",
    status: 401,
    detail: "The email or password is invalid.",
  });
}

function unknownTenantLoginError(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/tenant-login-not-found",
    title: "Login Workspace Not Found",
    status: 404,
    detail: "The requested login workspace was not found.",
  });
}

export function createAuthRouter(options: CreateAuthRouterOptions): Router {
  const router = Router();
  let authenticatePassword = options.authenticatePassword;

  if (!authenticatePassword && options.credentialReader) {
    const credentialReader = options.credentialReader;

    authenticatePassword = (input: PasswordCredentialLoginInput) =>
      authenticatePasswordForMfaChallenge(input, credentialReader);
  }

  if (!authenticatePassword) {
    throw new Error(
      "createAuthRouter requires authenticatePassword or credentialReader.",
    );
  }

  router.post(
    "/auth/login",
    async (req: Request, res: Response, next: NextFunction) => {
      const parsedBody = passwordLoginRequestSchema.safeParse(req.body);

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
          baseDomain: options.tenantLoginBaseDomain,
        });
        if (!loginSlug) {
          next(unknownTenantLoginError());
          return;
        }

        const tenant = await options.tenantLoginResolver.findActiveTenantByLoginSlug(loginSlug);
        if (!tenant) {
          next(unknownTenantLoginError());
          return;
        }

        const result = await authenticatePassword(toLoginInput(parsedBody.data, tenant.tenantId));
        if (result.status === "invalid_credentials") {
          next(invalidCredentialsError());
          return;
        }

        res.status(202).json(toMfaChallengeResponse(result));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
