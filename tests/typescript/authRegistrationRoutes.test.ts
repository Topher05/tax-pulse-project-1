import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { describe, expect, test, vi } from "vitest";

import {
  RegistrationEmailConflictError,
  createApp,
  createAuthRouter,
  createLogger,
  type RegistrationService,
} from "../../src/typescript/index.js";

const silentLogger = createLogger({ level: "silent" });
const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";
const userId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61";

async function withRegistrationServer(
  registrationService: RegistrationService,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (expressApp) => {
      expressApp.use(createAuthRouter({ registrationService }));
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

describe("registration route", () => {
  test("creates an account and returns only non-sensitive account details", async () => {
    const register = vi.fn<RegistrationService["register"]>(async () => ({
      id: userId,
      tenant_id: tenantId,
      email: "new-client@example.com",
      role: "Client",
      status: "invited",
    }));

    await withRegistrationServer({ register }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          email: "new-client@example.com",
          password: "synthetic-registration-password",
        }),
      });

      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toEqual({
        id: userId,
        tenant_id: tenantId,
        email: "new-client@example.com",
        role: "Client",
        status: "invited",
      });
      expect(register).toHaveBeenCalledWith({
        tenant_id: tenantId,
        email: "new-client@example.com",
        password: "synthetic-registration-password",
      });
    });
  });

  test("rejects malformed and privilege-bearing requests before registration", async () => {
    const register = vi.fn<RegistrationService["register"]>();

    await withRegistrationServer({ register }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: "not-a-uuid",
          email: "not-an-email",
          password: "",
          role: "Firm Admin",
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      expect(body).toMatchObject({
        type: "https://taxpulse.example/problems/validation-error",
        status: 400,
        code: "VALIDATION_ERROR",
      });
      expect(register).not.toHaveBeenCalled();
    });
  });

  test("maps an existing tenant email to a clear conflict response", async () => {
    const register = vi.fn<RegistrationService["register"]>(async () => {
      throw new RegistrationEmailConflictError();
    });

    await withRegistrationServer({ register }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          email: "existing-client@example.com",
          password: "synthetic-registration-password",
        }),
      });

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({
        type: "https://taxpulse.example/problems/email-already-registered",
        title: "Email Already Registered",
        status: 409,
        detail: "An account with this email is already registered for this tenant.",
        code: "EMAIL_ALREADY_REGISTERED",
      });
    });
  });
});
