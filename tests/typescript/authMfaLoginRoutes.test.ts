import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { describe, expect, test, vi } from "vitest";

import {
  ProblemHttpError,
  createApp,
  createAuthMfaLoginRouter,
  createLogger,
  type AuthMfaLoginController,
} from "../../src/typescript/index.js";

const silentLogger = createLogger({ level: "silent" });
const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";
const userId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61";

async function withRouteServer(
  controller: AuthMfaLoginController,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (expressApp) => {
      expressApp.use(createAuthMfaLoginRouter({ controller }));
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
  test("returns the full token pair after valid MFA verification", async () => {
    const verify = vi.fn<AuthMfaLoginController["verify"]>(async () => ({
      access_token: "signed.access.jwt",
      refresh_token: "opaque-refresh-token",
      token_type: "Bearer",
      expires_in: 900,
      refresh_expires_in: 2_592_000,
    }));

    await withRouteServer({ verify }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/login/mfa`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, user_id: userId, code: "123456" }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        access_token: "signed.access.jwt",
        refresh_token: "opaque-refresh-token",
        token_type: "Bearer",
        expires_in: 900,
        refresh_expires_in: 2_592_000,
      });
    });
  });

  test("rejects malformed MFA requests before calling the controller", async () => {
    const verify = vi.fn<AuthMfaLoginController["verify"]>();

    await withRouteServer({ verify }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/login/mfa`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant_id: "invalid", user_id: userId, code: "abc" }),
      });

      expect(response.status).toBe(400);
      expect(verify).not.toHaveBeenCalled();
    });
  });

  test("preserves the shared 401 response for rejected MFA authentication", async () => {
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
        body: JSON.stringify({ tenant_id: tenantId, user_id: userId, code: "123456" }),
      });

      expect(response.status).toBe(401);
    });
  });
});
