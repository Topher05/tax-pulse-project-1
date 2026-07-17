import { createHmac } from "node:crypto";

import { z } from "zod";

import { ProblemHttpError } from "./errors.js";
import {
  createDefaultMfaTotpProvider,
  type MfaEnrollmentRepository,
  type MfaTotpProvider,
} from "./mfaEnrollment.js";

export const authMfaLoginRequestSchema = z
  .object({
    tenant_id: z.string().uuid(),
    user_id: z.string().uuid(),
    code: z.string().regex(/^\d{6}$/, "TOTP code must be exactly 6 digits."),
  })
  .strict();

export const authMfaLoginResultSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal("Bearer"),
  expires_in: z.number().int().positive(),
});

export type AuthMfaLoginRequest = z.infer<typeof authMfaLoginRequestSchema>;
export type AuthMfaLoginResult = z.infer<typeof authMfaLoginResultSchema>;

export interface AccessTokenClaims {
  sub: string;
  tenant_id: string;
  iss: string;
  iat: number;
  exp: number;
}

export interface AccessTokenIssuer {
  issueAccessToken(input: {
    tenantId: string;
    userId: string;
  }): Promise<AuthMfaLoginResult>;
}

export interface HmacJwtIssuerOptions {
  issuer?: string;
  now?: () => Date;
  secret: string;
  ttlSeconds?: number;
}

export interface JwtIssuerEnv {
  TAXPULSE_ACCESS_TOKEN_TTL_SECONDS?: string;
  TAXPULSE_JWT_ISSUER?: string;
  TAXPULSE_JWT_SECRET?: string;
}

export interface JwtIssuerConfig {
  issuer: string;
  secret: string;
  ttlSeconds: number;
}

export interface AuthMfaLoginController {
  verify(input: AuthMfaLoginRequest): Promise<AuthMfaLoginResult>;
}

export interface CreateAuthMfaLoginControllerOptions {
  jwtIssuer: AccessTokenIssuer;
  repository: MfaEnrollmentRepository;
  totpProvider?: MfaTotpProvider;
}

const defaultJwtIssuer = "TaxPulse Core Case Service";
const defaultAccessTokenTtlSeconds = 900;

function base64UrlEncode(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url");
}

function parsePositiveInteger(input: {
  name: string;
  value: string | undefined;
}): number | null {
  if (input.value === undefined || input.value.trim() === "") {
    return null;
  }

  const parsed = Number(input.value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${input.name} must be a positive integer.`);
  }

  return parsed;
}

export function resolveJwtIssuerConfig(
  env: JwtIssuerEnv = process.env,
): JwtIssuerConfig {
  const secret = env.TAXPULSE_JWT_SECRET?.trim();

  if (!secret) {
    throw new Error("TAXPULSE_JWT_SECRET is required to issue access tokens.");
  }

  return {
    issuer: env.TAXPULSE_JWT_ISSUER?.trim() || defaultJwtIssuer,
    secret,
    ttlSeconds:
      parsePositiveInteger({
        name: "TAXPULSE_ACCESS_TOKEN_TTL_SECONDS",
        value: env.TAXPULSE_ACCESS_TOKEN_TTL_SECONDS,
      }) ?? defaultAccessTokenTtlSeconds,
  };
}

export function createHmacJwtIssuer({
  issuer = defaultJwtIssuer,
  now = () => new Date(),
  secret,
  ttlSeconds = defaultAccessTokenTtlSeconds,
}: HmacJwtIssuerOptions): AccessTokenIssuer {
  if (secret.trim() === "") {
    throw new Error("JWT secret must not be empty.");
  }

  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("JWT ttlSeconds must be a positive integer.");
  }

  return {
    async issueAccessToken({ tenantId, userId }) {
      const issuedAt = Math.floor(now().getTime() / 1000);
      const expiresAt = issuedAt + ttlSeconds;
      const header = {
        alg: "HS256",
        typ: "JWT",
      };
      const payload: AccessTokenClaims = {
        sub: userId,
        tenant_id: tenantId,
        iss: issuer,
        iat: issuedAt,
        exp: expiresAt,
      };
      const unsignedToken = [
        base64UrlEncode(JSON.stringify(header)),
        base64UrlEncode(JSON.stringify(payload)),
      ].join(".");
      const signature = createHmac("sha256", secret)
        .update(unsignedToken)
        .digest("base64url");

      return authMfaLoginResultSchema.parse({
        access_token: `${unsignedToken}.${signature}`,
        token_type: "Bearer",
        expires_in: ttlSeconds,
      });
    },
  };
}

export function createHmacJwtIssuerFromEnv(
  env: JwtIssuerEnv = process.env,
): AccessTokenIssuer {
  return createHmacJwtIssuer(resolveJwtIssuerConfig(env));
}

function authenticationFailedProblem(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/authentication-failed",
    title: "Authentication Failed",
    status: 401,
    detail: "The submitted MFA challenge or code is invalid.",
  });
}

export function createAuthMfaLoginController({
  jwtIssuer,
  repository,
  totpProvider = createDefaultMfaTotpProvider(),
}: CreateAuthMfaLoginControllerOptions): AuthMfaLoginController {
  return {
    async verify({ tenant_id, user_id, code }) {
      const user = await repository.findTenantUser({
        tenantId: tenant_id,
        userId: user_id,
      });

      if (user === null) {
        throw authenticationFailedProblem();
      }

      const enrollment = await repository.findEnrollment({ userId: user_id });

      if (enrollment === null || !enrollment.isEnrolled) {
        throw authenticationFailedProblem();
      }

      const isValid = await totpProvider.verifyCode({
        code,
        secret: enrollment.totpSecret,
      });

      if (!isValid) {
        throw authenticationFailedProblem();
      }

      return await jwtIssuer.issueAccessToken({
        tenantId: tenant_id,
        userId: user_id,
      });
    },
  };
}
