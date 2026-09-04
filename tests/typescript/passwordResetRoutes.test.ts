import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { describe, expect, test, vi } from "vitest";

import {
  InvalidResetTokenError,
  createApp,
  createLogger,
  createPasswordResetRouter,
  type TenantLoginResolver,
  type PasswordResetService,
} from "../../src/typescript/index.js";

const silentLogger = createLogger({ level: "silent" });
const tenantLoginHostname = "north-shore-advisors.taxpulse.example";
const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d51";
const tenantLoginResolver: TenantLoginResolver = {
  async findActiveTenantByLoginSlug(loginSlug) {
    return loginSlug === "north-shore-advisors"
      ? { tenantId, loginSlug }
      : null;
  },
};

async function withPasswordResetServer(
  service: PasswordResetService,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (expressApp) => {
      expressApp.use(createPasswordResetRouter({ service, tenantLoginResolver }));
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

describe("password reset routes", () => {
  describe("POST /auth/forgot-password", () => {
    test("accepts valid email and returns 202 status", async () => {
      const requestReset = vi.fn<PasswordResetService["requestReset"]>(async () => undefined);
      const service: PasswordResetService = {
        requestReset,
        confirmReset: vi.fn(),
      };

      await withPasswordResetServer(service, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/auth/forgot-password`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-host": tenantLoginHostname,
          },
          body: JSON.stringify({ email: "user@example.com" }),
        });

        expect(response.status).toBe(202);
        await expect(response.json()).resolves.toEqual({ accepted: true });
        expect(requestReset).toHaveBeenCalledWith(tenantId, "user@example.com");
      });
    });

    test("returns accepted without invoking reset service for unknown login workspace", async () => {
      const requestReset = vi.fn<PasswordResetService["requestReset"]>(async () => undefined);
      const service: PasswordResetService = {
        requestReset,
        confirmReset: vi.fn(),
      };

      await withPasswordResetServer(service, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/auth/forgot-password`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-host": "unknown.taxpulse.example",
          },
          body: JSON.stringify({ email: "user@example.com" }),
        });

        expect(response.status).toBe(202);
        await expect(response.json()).resolves.toEqual({ accepted: true });
        expect(requestReset).not.toHaveBeenCalled();
      });
    });

    test("returns 400 validation error for malformed email", async () => {
      const requestReset = vi.fn<PasswordResetService["requestReset"]>();
      const service: PasswordResetService = {
        requestReset,
        confirmReset: vi.fn(),
      };

      await withPasswordResetServer(service, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/auth/forgot-password`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "not-an-email" }),
        });

        expect(response.status).toBe(400);
        expect(response.headers.get("content-type")).toContain("application/problem+json");
        const body = await response.json();
        expect(body).toMatchObject({
          type: "https://taxpulse.example/problems/validation-error",
          status: 400,
          code: "VALIDATION_ERROR",
        });
        expect(requestReset).not.toHaveBeenCalled();
      });
    });
  });

  describe("POST /auth/reset-password", () => {
    test("confirms password reset and returns 200 with reset confirmation", async () => {
      const confirmReset = vi.fn<PasswordResetService["confirmReset"]>(async () => undefined);
      const service: PasswordResetService = {
        requestReset: vi.fn(),
        confirmReset,
      };

      await withPasswordResetServer(service, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/auth/reset-password`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            token: "valid-token-123",
            new_password: "new-secure-password",
          }),
        });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ reset: true });
        expect(confirmReset).toHaveBeenCalledWith("valid-token-123", "new-secure-password");
      });
    });

    test("returns 401 when token is invalid or expired", async () => {
      const confirmReset = vi.fn<PasswordResetService["confirmReset"]>(async () => {
        throw new InvalidResetTokenError();
      });
      const service: PasswordResetService = {
        requestReset: vi.fn(),
        confirmReset,
      };

      await withPasswordResetServer(service, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/auth/reset-password`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            token: "expired-or-invalid-token",
            new_password: "new-secure-password",
          }),
        });

        expect(response.status).toBe(401);
        expect(response.headers.get("content-type")).toContain("application/problem+json");
        await expect(response.json()).resolves.toMatchObject({
          type: "https://taxpulse.example/problems/invalid-reset-token",
          title: "Invalid Reset Token",
          status: 401,
          detail: "The reset token is invalid or has expired.",
        });
      });
    });

    test("returns 400 validation error for short password", async () => {
      const confirmReset = vi.fn<PasswordResetService["confirmReset"]>();
      const service: PasswordResetService = {
        requestReset: vi.fn(),
        confirmReset,
      };

      await withPasswordResetServer(service, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/auth/reset-password`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            token: "some-token",
            new_password: "short",
          }),
        });

        expect(response.status).toBe(400);
        expect(response.headers.get("content-type")).toContain("application/problem+json");
        expect(confirmReset).not.toHaveBeenCalled();
      });
    });
  });
});
