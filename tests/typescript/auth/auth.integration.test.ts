import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { describe, expect, test, vi } from "vitest";

import {
  createApp,
  createAuthRouter,
  createLogger,
  type AuthValidationErrorResponse,
  type PasswordAuthenticator,
  type TenantLoginResolver,
} from "../../../src/typescript/index.js";
import { authEmail, authTenantId } from "./auth.test.model.js";

const silentLogger = createLogger({ level: "silent" });
const tenantLoginHostname = "north-shore-advisors.taxpulse.example";
const tenantLoginSlug = "north-shore-advisors";

function createTestTenantLoginResolver(): TenantLoginResolver {
  return {
    async findActiveTenantByLoginSlug(loginSlug) {
      return loginSlug === tenantLoginSlug
        ? { tenantId: authTenantId, loginSlug }
        : null;
    },
  };
}

async function withAuthServer(
  authenticatePassword: PasswordAuthenticator,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (app) => {
      app.use(
        createAuthRouter({
          authenticatePassword,
          tenantLoginResolver: createTestTenantLoginResolver(),
        }),
      );
    },
  });
  app.set("trust proxy", true);

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

describe("auth route integration", () => {
  test("returns 400 Problem Details for malformed login bodies", async () => {
    const authenticatePassword = vi.fn<PasswordAuthenticator>();

    await withAuthServer(authenticatePassword, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: "not-a-uuid",
          email: "not-an-email",
          password: "",
          token: "must-not-be-accepted",
        }),
      });
      const body = (await response.json()) as AuthValidationErrorResponse;

      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      expect(body).toMatchObject({
        type: "https://taxpulse.example/problems/validation-error",
        title: "Validation Error",
        status: 400,
        detail: "Request body failed validation.",
        code: "VALIDATION_ERROR",
      });
      expect(body.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["email"] }),
          expect.objectContaining({ path: ["password"] }),
          expect.objectContaining({ code: "unrecognized_keys" }),
        ]),
      );
      expect(authenticatePassword).not.toHaveBeenCalled();
    });
  });

  test("returns the same 401 problem for wrong passwords and unknown emails", async () => {
    const authenticatePassword = vi.fn<PasswordAuthenticator>(async () => ({
      status: "invalid_credentials",
    }));
    const loginBody = {
      email: authEmail,
      password: "wrong-password",
    };

    await withAuthServer(authenticatePassword, async (baseUrl) => {
      const wrongPasswordResponse = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-host": tenantLoginHostname },
        body: JSON.stringify(loginBody),
      });
      const unknownEmailResponse = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-host": tenantLoginHostname },
        body: JSON.stringify({
          ...loginBody,
          email: "unknown@example.com",
        }),
      });

      expect(wrongPasswordResponse.status).toBe(401);
      expect(unknownEmailResponse.status).toBe(401);
      await expect(wrongPasswordResponse.json()).resolves.toEqual({
        type: "https://taxpulse.example/problems/invalid-credentials",
        title: "Invalid Credentials",
        status: 401,
        detail: "The email or password is invalid.",
      });
      await expect(unknownEmailResponse.json()).resolves.toEqual({
        type: "https://taxpulse.example/problems/invalid-credentials",
        title: "Invalid Credentials",
        status: 401,
        detail: "The email or password is invalid.",
      });
    });

    expect(authenticatePassword).toHaveBeenCalledTimes(2);
  });

  test("rejects a client-supplied tenant ID even when credentials are otherwise valid", async () => {
    const authenticatePassword = vi.fn<PasswordAuthenticator>();

    await withAuthServer(authenticatePassword, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-host": tenantLoginHostname },
        body: JSON.stringify({
          tenant_id: authTenantId,
          email: authEmail,
          password: "correct-password",
        }),
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({ code: "VALIDATION_ERROR" });
    });

    expect(authenticatePassword).not.toHaveBeenCalled();
  });

  test("advances valid password logins to MFA challenge without issuing a token", async () => {
    const authenticatePassword = vi.fn<PasswordAuthenticator>(async () => ({
      status: "mfa_challenge_required",
      tenantId: authTenantId,
      email: authEmail,
      userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
    }));

    await withAuthServer(authenticatePassword, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-host": tenantLoginHostname },
        body: JSON.stringify({
          email: authEmail,
          password: "correct-password",
        }),
      });
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(202);
      expect(authenticatePassword).toHaveBeenCalledWith({
        tenantId: authTenantId,
        email: authEmail,
        plaintextPassword: "correct-password",
      });
      expect(body).toEqual({
        status: "mfa_challenge_required",
        tenant_id: authTenantId,
        email: authEmail,
        user_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
      });
      expect(body).not.toHaveProperty("token");
    });
  });

  test("rejects an unknown tenant login hostname before password authentication", async () => {
    const authenticatePassword = vi.fn<PasswordAuthenticator>();

    await withAuthServer(authenticatePassword, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-host": "unknown.taxpulse.example",
        },
        body: JSON.stringify({ email: authEmail, password: "correct-password" }),
      });

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        type: "https://taxpulse.example/problems/tenant-login-not-found",
        title: "Login Workspace Not Found",
        status: 404,
        detail: "The requested login workspace was not found.",
      });
    });

    expect(authenticatePassword).not.toHaveBeenCalled();
  });
});
