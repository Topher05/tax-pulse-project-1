import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { SignJWT } from "jose";
import { describe, expect, test } from "vitest";

import {
  createApp,
  createJwtAuthenticationMiddleware,
  createLogger,
  type JwtConfig,
} from "../../src/typescript/index.js";

const config: JwtConfig = {
  issuer: "https://auth.taxpulse.example",
  signingSecret: "a-unique-test-secret-that-is-more-than-32-bytes",
  accessTokenLifetimeSeconds: 900,
  refreshTokenLifetimeSeconds: 2_592_000,
};
const signingKey = new TextEncoder().encode(config.signingSecret);
const silentLogger = createLogger({ level: "silent" });

async function createAccessToken(input: {
  issuer?: string;
  signingSecret?: string;
  subject?: unknown;
  role?: unknown;
  tenantId?: unknown;
  expirationTime?: string | number;
  includeExpiration?: boolean;
  includeRole?: boolean;
  includeTenantId?: boolean;
  includeSubject?: boolean;
} = {}): Promise<string> {
  const claims: Record<string, unknown> = {};
  if (input.includeRole ?? true) {
    if (input.role !== undefined) {
      claims.role = input.role;
    } else {
      claims.role = "Advisor";
    }
  }
  if (input.includeTenantId ?? true) {
    if (input.tenantId !== undefined) {
      claims.tenant_id = input.tenantId;
    } else {
      claims.tenant_id = "tenant-001";
    }
  }

  const token = new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(input.issuer ?? config.issuer);

  if (input.includeExpiration ?? true) {
    token.setExpirationTime(input.expirationTime ?? "15m");
  }

  if (input.includeSubject ?? true) {
    if (input.subject !== undefined) {
      token.setSubject(input.subject as string);
    } else {
      token.setSubject("user-001");
    }
  }

  return await token.sign(
    new TextEncoder().encode(input.signingSecret ?? config.signingSecret),
  );
}

async function createTokenWithoutClaim(claim: "role" | "tenant_id" | "sub"): Promise<string> {
  if (claim === "role") {
    return await createAccessToken({ includeRole: false });
  }
  if (claim === "tenant_id") {
    return await createAccessToken({ includeTenantId: false });
  }
  return await createAccessToken({ includeSubject: false });
}

async function invalidTokenFor(description: string): Promise<string> {
  if (description === "missing role") {
    return await createTokenWithoutClaim("role");
  }
  if (description === "missing tenant_id") {
    return await createTokenWithoutClaim("tenant_id");
  }
  if (description === "missing sub") {
    return await createTokenWithoutClaim("sub");
  }

  const options = invalidTokenOptions[description];
  if (!options) {
    throw new Error(`Unsupported invalid-token scenario: ${description}`);
  }
  return await createAccessToken(options);
}

const invalidTokenOptions: Record<string, Parameters<typeof createAccessToken>[0]> = {
  "invalid signature": {
    signingSecret: "another-test-secret-that-is-more-than-32-bytes",
  },
  "expired token": { expirationTime: 0 },
  "wrong issuer": { issuer: "https://other.taxpulse.example" },
  "missing expiry": { includeExpiration: false },
  "invalid role type": { role: 42 },
  "invalid tenant_id type": { tenantId: 42 },
};

async function withProtectedServer(
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (server) => {
      server.use(createJwtAuthenticationMiddleware({ config }));
      server.get("/protected", (req, res) => {
        res.status(200).json(req.authenticatedPrincipal);
      });
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

describe("createJwtAuthenticationMiddleware", () => {
  test.each([
    ["missing Authorization header", undefined],
    ["non-Bearer Authorization header", "Basic abc123"],
    ["malformed token", "Bearer not-a-jwt"],
  ])("returns the standard 401 for %s", async (_description, authorization) => {
    await withProtectedServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/protected`, {
        headers: authorization ? { authorization } : undefined,
      });

      expect(response.status).toBe(401);
      expect(response.headers.get("content-type")).toContain("application/problem+json");
      await expect(response.json()).resolves.toEqual({
        type: "https://taxpulse.example/problems/authentication-required",
        title: "Authentication Required",
        status: 401,
        detail: "A valid access token is required.",
      });
    });
  });

  test.each([
    "invalid signature",
    "expired token",
    "wrong issuer",
    "missing expiry",
    "missing role",
    "missing tenant_id",
    "missing sub",
    "invalid role type",
    "invalid tenant_id type",
  ])("returns the standard 401 for %s", async (description) => {
    const token = await invalidTokenFor(description);

    await withProtectedServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/protected`, {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        type: "https://taxpulse.example/problems/authentication-required",
        status: 401,
      });
    });
  });

  test("passes a verified principal to downstream handlers", async () => {
    const token = await createAccessToken({
      subject: "user-verified",
      role: "Firm Admin",
      tenantId: "tenant-verified",
    });

    await withProtectedServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/protected`, {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        userId: "user-verified",
        role: "Firm Admin",
        tenantId: "tenant-verified",
      });
    });
  });
});
