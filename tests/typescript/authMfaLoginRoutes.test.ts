import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { describe, expect, test, vi } from "vitest";

import {
  ProblemHttpError,
  createApp,
  createAuthMfaLoginController,
  createAuthMfaLoginRouter,
  createAuthRouter,
  createHmacJwtIssuer,
  createLogger,
  type AuthMfaLoginController,
  type AuthMfaValidationErrorResponse,
  type MfaEnrollmentRecord,
  type MfaEnrollmentRepository,
  type MfaTenantUser,
  type MfaTotpProvider,
  type PasswordAuthenticator,
} from "../../src/typescript/index.js";

const silentLogger = createLogger({ level: "silent" });
const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";
const userId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61";
const userEmail = "alex@example.com";
const validCode = "123456";

class InMemoryMfaEnrollmentRepository implements MfaEnrollmentRepository {
  readonly tenantUser: MfaTenantUser = {
    id: userId,
    email: userEmail,
  };

  enrollment: MfaEnrollmentRecord | null = {
    userId,
    totpSecret: "FAKEBASE32SECRETFAKEBASE32SECRET",
    isEnrolled: true,
  };

  async findTenantUser(input: {
    tenantId: string;
    userId: string;
  }): Promise<MfaTenantUser | null> {
    if (input.tenantId === tenantId && input.userId === userId) {
      return this.tenantUser;
    }

    return null;
  }

  async findEnrollment(): Promise<MfaEnrollmentRecord | null> {
    return this.enrollment;
  }

  async savePendingEnrollment(input: {
    userId: string;
    totpSecret: string;
  }): Promise<void> {
    this.enrollment = {
      userId: input.userId,
      totpSecret: input.totpSecret,
      isEnrolled: false,
    };
  }

  async markEnrolled(input: {
    userId: string;
  }): Promise<void> {
    if (this.enrollment?.userId === input.userId) {
      this.enrollment = {
        ...this.enrollment,
        isEnrolled: true,
      };
    }
  }
}

const fakeTotpProvider: MfaTotpProvider = {
  generateSecret: () => "FAKEBASE32SECRETFAKEBASE32SECRET",
  generateProvisioningUri: () => "otpauth://totp/TaxPulse%20Advisory:test",
  verifyCode: async ({ code }) => code === validCode,
};

async function withRouteServer(
  controller: AuthMfaLoginController,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (app) => {
      app.use(createAuthMfaLoginRouter({ controller }));
    },
  });

  const server = app.listen(0);
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

describe("createAuthMfaLoginRouter", () => {
  test("passes valid MFA login requests to the controller layer", async () => {
    const verify = vi.fn<AuthMfaLoginController["verify"]>(() =>
      Promise.resolve({
        access_token: "signed.jwt.token",
        token_type: "Bearer",
        expires_in: 900,
      }),
    );

    await withRouteServer({ verify }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/login/mfa`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: userId,
          code: validCode,
        }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        access_token: "signed.jwt.token",
        token_type: "Bearer",
        expires_in: 900,
      });
      expect(verify).toHaveBeenCalledWith({
        tenant_id: tenantId,
        user_id: userId,
        code: validCode,
      });
    });
  });

  test("returns 400 Problem Details for malformed MFA login requests", async () => {
    const verify = vi.fn<AuthMfaLoginController["verify"]>();

    await withRouteServer({ verify }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/login/mfa`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: "not-a-uuid",
          user_id: userId,
          code: "abc",
        }),
      });
      const body = (await response.json()) as AuthMfaValidationErrorResponse;

      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      expect(body).toMatchObject({
        type: "https://taxpulse.example/problems/validation-error",
        title: "Validation Error",
        status: 400,
        code: "VALIDATION_ERROR",
      });
      expect(body.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["tenant_id"] }),
          expect.objectContaining({ path: ["code"] }),
        ]),
      );
      expect(verify).not.toHaveBeenCalled();
    });
  });

  test("returns shared 401 Problem Details when MFA login rejects authentication", async () => {
    const verify = vi.fn<AuthMfaLoginController["verify"]>(() => {
      throw new ProblemHttpError({
        type: "https://taxpulse.example/problems/authentication-failed",
        title: "Authentication Failed",
        status: 401,
        detail: "The submitted MFA challenge or code is invalid.",
      });
    });

    await withRouteServer({ verify }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/login/mfa`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: userId,
          code: validCode,
        }),
      });

      expect(response.status).toBe(401);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      await expect(response.json()).resolves.toEqual({
        type: "https://taxpulse.example/problems/authentication-failed",
        title: "Authentication Failed",
        status: 401,
        detail: "The submitted MFA challenge or code is invalid.",
      });
    });
  });

  test("issues a JWT after password login returns challenge identifiers", async () => {
    const repository = new InMemoryMfaEnrollmentRepository();
    const jwtIssuer = createHmacJwtIssuer({
      now: () => new Date("2026-07-16T18:00:00Z"),
      secret: "synthetic-test-secret",
      ttlSeconds: 900,
    });
    const issueAccessToken = vi.spyOn(jwtIssuer, "issueAccessToken");
    const mfaController = createAuthMfaLoginController({
      jwtIssuer,
      repository,
      totpProvider: fakeTotpProvider,
    });
    const authenticatePassword = vi.fn<PasswordAuthenticator>(async (input) => {
      if (input.plaintextPassword !== "correct-password") {
        return { status: "invalid_credentials" };
      }

      return {
        status: "mfa_challenge_required",
        tenantId,
        email: userEmail,
        userId,
      };
    });
    const app = createApp({
      logger: silentLogger,
      registerRoutes: (app) => {
        app.use(createAuthRouter({ authenticatePassword }));
        app.use(createAuthMfaLoginRouter({ controller: mfaController }));
      },
    });

    const server = app.listen(0);
    await once(server, "listening");

    try {
      const address = server.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const badLoginResponse = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          email: userEmail,
          password: "wrong-password",
        }),
      });

      expect(badLoginResponse.status).toBe(401);
      expect(issueAccessToken).not.toHaveBeenCalled();

      const loginResponse = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          email: userEmail,
          password: "correct-password",
        }),
      });
      const challenge = (await loginResponse.json()) as {
        tenant_id: string;
        user_id: string;
      };

      expect(loginResponse.status).toBe(202);

      const mfaResponse = await fetch(`${baseUrl}/auth/login/mfa`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: challenge.tenant_id,
          user_id: challenge.user_id,
          code: validCode,
        }),
      });
      const token = (await mfaResponse.json()) as {
        access_token: string;
        expires_in: number;
        token_type: string;
      };

      expect(mfaResponse.status).toBe(200);
      expect(token).toMatchObject({
        token_type: "Bearer",
        expires_in: 900,
      });
      expect(token.access_token.split(".")).toHaveLength(3);
      expect(issueAccessToken).toHaveBeenCalledTimes(1);
    } finally {
      server.close();
      await once(server, "close");
    }
  });
});
