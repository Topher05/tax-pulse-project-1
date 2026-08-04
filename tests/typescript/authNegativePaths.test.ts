import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { SignJWT } from "jose";
import { describe, expect, test, vi } from "vitest";

import {
  createApp,
  createAuthMfaLoginRouter,
  createAuthRouter,
  createJwtAuthenticationMiddleware,
  createLogger,
  type AuthMfaLoginController,
  type JwtConfig,
  type PasswordAuthenticator,
  type TenantLoginResolver,
} from "../../src/typescript/index.js";

const config: JwtConfig = {
  issuer: "https://auth.taxpulse.example",
  signingSecret: "a-unique-test-secret-that-is-more-than-32-bytes",
  accessTokenLifetimeSeconds: 900,
  refreshTokenLifetimeSeconds: 2_592_000,
};
const silentLogger = createLogger({ level: "silent" });
const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";
const userId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61";
const email = "alex@example.com";
const validPassword = "synthetic-valid-password-63";
const tenantLoginHostname = "north-shore-advisors.taxpulse.example";
const tenantLoginResolver: TenantLoginResolver = {
  async findActiveTenantByLoginSlug(loginSlug) {
    return loginSlug === "north-shore-advisors" ? { tenantId, loginSlug } : null;
  },
};

async function createAccessToken(): Promise<string> {
  return await new SignJWT({
    role: "Advisor",
    tenant_id: tenantId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(config.issuer)
    .setExpirationTime("15m")
    .sign(new TextEncoder().encode(config.signingSecret));
}

function tamperToken(token: string): string {
  return `${token}.tampered`;
}

async function withAuthNegativePathServer(
  run: (
    baseUrl: string,
    spies: { verifyMfa: AuthMfaLoginController["verify"] },
  ) => Promise<void>,
): Promise<void> {
  const authenticatePassword = vi.fn<PasswordAuthenticator>(async (input) => {
    if (
      input.tenantId === tenantId &&
      input.email === email &&
      input.plaintextPassword === validPassword
    ) {
      return {
        status: "mfa_challenge_required",
        tenantId,
        email,
        userId,
      };
    }

    return { status: "invalid_credentials" };
  });
  const verifyMfa = vi.fn<AuthMfaLoginController["verify"]>(async () => ({
    access_token: "signed.access.jwt",
    refresh_token: "opaque-refresh-token",
    token_type: "Bearer",
    expires_in: 900,
    refresh_expires_in: 2_592_000,
  }));
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (server) => {
      server.use(createAuthRouter({ authenticatePassword, tenantLoginResolver }));
      server.use(createAuthMfaLoginRouter({ controller: { verify: verifyMfa } }));
      server.use("/protected", createJwtAuthenticationMiddleware({ config }));
      server.get("/protected", (req, res) => {
        res.status(200).json(req.authenticatedPrincipal);
      });
    },
  });
  app.set("trust proxy", true);
  const server = app.listen(0);
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`, { verifyMfa });
  } finally {
    server.close();
    await once(server, "close");
  }
}

describe("auth negative paths", () => {
  test("returns 401 for a wrong password", async () => {
    await withAuthNegativePathServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-host": tenantLoginHostname,
        },
        body: JSON.stringify({
          email,
          password: "wrong-password",
        }),
      });

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        type: "https://taxpulse.example/problems/invalid-credentials",
        status: 401,
      });
    });
  });

  test("returns 401 when password login is not followed by MFA verification", async () => {
    await withAuthNegativePathServer(async (baseUrl, { verifyMfa }) => {
      const loginResponse = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-host": tenantLoginHostname,
        },
        body: JSON.stringify({
          email,
          password: validPassword,
        }),
      });
      const protectedResponse = await fetch(`${baseUrl}/protected`);

      expect(loginResponse.status).toBe(202);
      await expect(loginResponse.json()).resolves.toEqual({
        status: "mfa_challenge_required",
        tenant_id: tenantId,
        email,
        user_id: userId,
      });
      expect(protectedResponse.status).toBe(401);
      await expect(protectedResponse.json()).resolves.toMatchObject({
        type: "https://taxpulse.example/problems/authentication-required",
        status: 401,
      });
      expect(verifyMfa).not.toHaveBeenCalled();
    });
  });

  test("returns 401 for a tampered bearer token", async () => {
    const token = await createAccessToken();

    await withAuthNegativePathServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/protected`, {
        headers: { authorization: `Bearer ${tamperToken(token)}` },
      });

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        type: "https://taxpulse.example/problems/authentication-required",
        status: 401,
      });
    });
  });

  test("returns 404 for the out-of-scope SSO callback route", async () => {
    await withAuthNegativePathServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/callback/oidc`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "synthetic-oidc-code" }),
      });

      expect(response.status).toBe(404);
    });
  });
});
