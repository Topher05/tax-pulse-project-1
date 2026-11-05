import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { describe, expect, test, vi } from "vitest";

import {
  createApp,
  createAuthSessionRouter,
  createLogger,
  type TokenService,
} from "../../../../src/typescript/index.js";

const silentLogger = createLogger({ level: "silent" });

function createTokenService(): TokenService {
  return {
    issue: vi.fn(),
    revokeRefreshToken: vi.fn(async () => true),
    rotateRefreshToken: vi.fn(async () => ({
      accessToken: "rotated.access.jwt",
      refreshToken: "rotated-refresh-token",
      accessTokenExpiresInSeconds: 900,
      refreshTokenExpiresInSeconds: 2_592_000,
      accessTokenExpiresAt: new Date("2026-08-01T12:15:00Z"),
      refreshTokenExpiresAt: new Date("2026-08-31T12:00:00Z"),
    })),
  };
}

async function withRouteServer(
  tokenService: TokenService,
  run: (baseUrl: string) => Promise<void>,
  secureCookies: boolean = true,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (expressApp) => {
      expressApp.use(createAuthSessionRouter({ tokenService, secureCookies }));
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

describe("auth session routes", () => {
  test("rotates a valid refresh cookie and never returns its raw value in JSON", async () => {
    const tokenService = createTokenService();

    await withRouteServer(tokenService, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { cookie: "taxpulse_refresh_token=prior-refresh-token" },
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        access_token: "rotated.access.jwt",
        token_type: "Bearer",
        expires_in: 900,
        refresh_expires_in: 2_592_000,
      });
      expect(response.headers.get("set-cookie")).toMatch(
        /taxpulse_refresh_token=rotated-refresh-token; Max-Age=2592000; Path=\/auth; Expires=[^;]+; HttpOnly; Secure; SameSite=Strict/i,
      );
    });

    expect(tokenService.rotateRefreshToken).toHaveBeenCalledWith("prior-refresh-token");
  });

  test("invalid refresh sessions clear the cookie and return 401", async () => {
    const tokenService = createTokenService();
    vi.mocked(tokenService.rotateRefreshToken).mockResolvedValueOnce(null);

    await withRouteServer(tokenService, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { cookie: "taxpulse_refresh_token=expired-token" },
      });

      expect(response.status).toBe(401);
      expect(response.headers.get("set-cookie")).toMatch(
        /taxpulse_refresh_token=; Path=\/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict/i,
      );
    });
  });

  test("uses non-secure refresh cookies for the local HTTP BFF", async () => {
    const tokenService = createTokenService();

    await withRouteServer(tokenService, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { cookie: "taxpulse_refresh_token=prior-refresh-token" },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("set-cookie")).not.toContain("Secure");
    }, false);
  });

  test("logout revokes the refresh session when present and always clears its cookie", async () => {
    const tokenService = createTokenService();

    await withRouteServer(tokenService, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/logout`, {
        method: "POST",
        headers: { cookie: "taxpulse_refresh_token=active-token" },
      });

      expect(response.status).toBe(204);
      expect(response.headers.get("set-cookie")).toMatch(
        /taxpulse_refresh_token=; Path=\/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict/i,
      );
    });

    expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith("active-token");
  });
});
