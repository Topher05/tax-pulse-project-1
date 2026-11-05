import { z } from "zod";

import { ProblemHttpError } from "../../../platform/http/errors.js";
import {
  createDefaultMfaTotpProvider,
  type MfaEnrollmentRepository,
  type MfaTotpProvider,
} from "./mfaEnrollment.js";
import type { TokenService } from "./tokenService.js";

export const authMfaLoginRequestSchema = z
  .object({
    tenant_id: z.uuid(),
    user_id: z.uuid(),
    code: z.string().regex(/^\d{6}$/, "TOTP code must be exactly 6 digits."),
  })
  .strict();

export const authMfaLoginResultSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_type: z.literal("Bearer"),
  expires_in: z.number().int().positive(),
  refresh_expires_in: z.number().int().positive(),
});

export type AuthMfaLoginRequest = z.infer<typeof authMfaLoginRequestSchema>;
export type AuthMfaLoginResult = z.infer<typeof authMfaLoginResultSchema>;

export interface AuthMfaLoginController {
  verify(input: AuthMfaLoginRequest): Promise<AuthMfaLoginResult>;
}

export interface CreateAuthMfaLoginControllerOptions {
  tokenService: TokenService;
  repository: MfaEnrollmentRepository;
  totpProvider?: MfaTotpProvider;
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
  tokenService,
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

      const enrollment = await repository.findEnrollment({ userId: user.id });

      if (enrollment === null || !enrollment.isEnrolled) {
        throw authenticationFailedProblem();
      }

      const isValid = await totpProvider.verifyCode({
        code,
        secret: enrollment.totpSecret,
      });

      // TODO: CL isValid check sometimes fails potentially due to base32 hmac computation via vanilla js using cryptoJS, version issue? Formatting? Not sure look into this later, just comment out as needed for local token gen
      if (!isValid) {
        throw authenticationFailedProblem();
      }

      const pair = await tokenService.issue({
        userId: user.id,
        role: user.role,
        tenantId: user.tenantId,
      });

      return authMfaLoginResultSchema.parse({
        access_token: pair.accessToken,
        refresh_token: pair.refreshToken,
        token_type: "Bearer",
        expires_in: pair.accessTokenExpiresInSeconds,
        refresh_expires_in: pair.refreshTokenExpiresInSeconds,
      });
    },
  };
}
