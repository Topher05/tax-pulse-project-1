import { once } from "node:events";
import type { AddressInfo } from "node:net";

import type { RequestHandler } from "express";

import {
  createApp,
  createAuthMfaLoginController,
  createAuthMfaLoginRouter,
  createAuthRouter,
  createLogger,
  createTokenService,
  type AuthMfaLoginResult,
  type AuthenticatedPrincipal,
  type JwtConfig,
  type MfaEnrollmentRepository,
  type PasswordAuthenticator,
  type UserRole,
} from "../../../src/typescript/index.js";

const silentLogger = createLogger({ level: "silent" });

interface BootstrapPrincipal extends AuthenticatedPrincipal {
  email: string;
  password: string;
  totpSecret: string;
  totpCode: string;
}

interface BootstrapOptions {
  config: JwtConfig;
  principal: BootstrapPrincipal;
}

interface BootstrapLoginChallenge {
  status: "mfa_challenge_required";
  tenant_id: string;
  email: string;
  user_id: string;
}

function createNoopRefreshTokenRepository() {
  return {
    async persist(): Promise<void> {
      return undefined;
    },
    async revokeByTokenHash(): Promise<boolean> {
      return false;
    },
  };
}

function createBootstrapRepository(
  principal: BootstrapPrincipal,
): MfaEnrollmentRepository {
  return {
    async findTenantUser(input) {
      if (
        input.tenantId === principal.tenantId &&
        input.userId === principal.userId
      ) {
        return {
          id: principal.userId,
          email: principal.email,
          tenantId: principal.tenantId,
          role: principal.role,
        };
      }

      return null;
    },
    async findEnrollment(input) {
      if (input.userId !== principal.userId) {
        return null;
      }

      return {
        userId: principal.userId,
        totpSecret: principal.totpSecret,
        isEnrolled: true,
      };
    },
    async savePendingEnrollment(): Promise<void> {
      return undefined;
    },
    async markEnrolled(): Promise<void> {
      return undefined;
    },
  };
}

function createBootstrapAuthenticator(
  principal: BootstrapPrincipal,
): PasswordAuthenticator {
  return async (input) => {
    if (
      input.tenantId === principal.tenantId &&
      input.email === principal.email &&
      input.plaintextPassword === principal.password
    ) {
      return {
        status: "mfa_challenge_required",
        tenantId: principal.tenantId,
        email: principal.email,
        userId: principal.userId,
      };
    }

    return { status: "invalid_credentials" };
  };
}

async function withBootstrapAuthServer(
  options: BootstrapOptions,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const tokenService = createTokenService({
    config: options.config,
    refreshTokenRepository: createNoopRefreshTokenRepository(),
  });
  const controller = createAuthMfaLoginController({
    tokenService,
    repository: createBootstrapRepository(options.principal),
    totpProvider: {
      generateSecret: () => options.principal.totpSecret,
      generateProvisioningUri: ({ accountLabel, secret }) =>
        `otpauth://totp/TaxPulse%20Advisory:${encodeURIComponent(accountLabel)}?secret=${secret}&issuer=TaxPulse%20Advisory`,
      verifyCode: async ({ code, secret }) =>
        code === options.principal.totpCode &&
        secret === options.principal.totpSecret,
    },
  });
  const authenticatePassword = createBootstrapAuthenticator(options.principal);

  const app = createApp({
    logger: silentLogger,
    registerRoutes: (expressApp) => {
      expressApp.use(createAuthRouter({ authenticatePassword }));
      expressApp.use(createAuthMfaLoginRouter({ controller }));
    },
  });

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

export async function obtainAccessTokenViaLoginAndMfa(
  options: BootstrapOptions,
): Promise<AuthMfaLoginResult> {
  let challenge: BootstrapLoginChallenge | null = null;
  let result: AuthMfaLoginResult | null = null;

  await withBootstrapAuthServer(options, async (baseUrl) => {
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tenant_id: options.principal.tenantId,
        email: options.principal.email,
        password: options.principal.password,
      }),
    });
    challenge = (await loginResponse.json()) as BootstrapLoginChallenge;

    if (loginResponse.status !== 202) {
      throw new Error(`Expected login challenge response, received ${loginResponse.status}.`);
    }

    const mfaResponse = await fetch(`${baseUrl}/auth/login/mfa`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tenant_id: challenge.tenant_id,
        user_id: challenge.user_id,
        code: options.principal.totpCode,
      }),
    });
    result = (await mfaResponse.json()) as AuthMfaLoginResult;

    if (mfaResponse.status !== 200) {
      throw new Error(`Expected MFA token response, received ${mfaResponse.status}.`);
    }
  });

  if (!challenge || !result) {
    throw new Error("Bootstrap authentication did not complete.");
  }

  return result;
}

export function createJwtDerivedUserContext(
  permissionsForRole: Partial<Record<UserRole, ReadonlyArray<string>>> = {
    Advisor: ["EDIT"],
  },
): RequestHandler {
  return (req, _res, next) => {
    const principal = req.authenticatedPrincipal;

    if (!principal) {
      next(new Error("Authenticated principal missing after JWT verification."));
      return;
    }

    (req as typeof req & {
      user: {
        id: string;
        role: UserRole;
        permissions?: string[];
      };
    }).user = {
      id: principal.userId,
      role: principal.role,
      permissions: [...(permissionsForRole[principal.role] ?? [])],
    };

    next();
  };
}
