import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { SignJWT } from "jose";
import { describe, expect, test, vi } from "vitest";

import {
  createApp,
  createJwtAuthenticationMiddleware,
  createLogger,
  createTaxPlanCycleRouter,
  type JwtConfig,
  type TaxPlanCycle,
  type TaxPlanCycleCreateController,
  type TaxPlanCycleCreateInput,
} from "../../src/typescript/index.js";

const config: JwtConfig = {
  issuer: "https://auth.taxpulse.example",
  signingSecret: "a-unique-test-secret-that-is-more-than-32-bytes",
  accessTokenLifetimeSeconds: 900,
  refreshTokenLifetimeSeconds: 2_592_000,
};
const silentLogger = createLogger({ level: "silent" });
const validCreateBody: TaxPlanCycleCreateInput = {
  client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
  planning_period: "2026-Q4",
  owner: "untrusted-body-owner",
  priority: "high",
  due_date: "2026-12-31",
};
const cycle: TaxPlanCycle = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
  client_id: validCreateBody.client_id,
  stage: "Intake",
  owner: validCreateBody.owner,
  priority: validCreateBody.priority,
  due_date: validCreateBody.due_date,
  on_hold: false,
};

async function createAccessToken(): Promise<string> {
  return await new SignJWT({
    role: "Advisor",
    tenant_id: "tenant-from-jwt",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject("user-from-jwt")
    .setIssuer(config.issuer)
    .setExpirationTime("15m")
    .sign(new TextEncoder().encode(config.signingSecret));
}

async function withProtectedTaxPlanCycleServer(
  controller: TaxPlanCycleCreateController,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (server) => {
      server.use(
        "/tax-plan-cycles",
        createJwtAuthenticationMiddleware({ config }),
      );
      server.use(createTaxPlanCycleRouter({ controller }));
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

describe("JWT-protected Tax Plan Cycle routes", () => {
  test("rejects an unauthenticated operational request before the controller runs", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: cycle.id,
    }));
    const findByCaseId = vi.fn<TaxPlanCycleCreateController["findByCaseId"]>(() => cycle);

    await withProtectedTaxPlanCycleServer({ create, findByCaseId }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/tax-plan-cycles`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validCreateBody),
      });

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        type: "https://taxpulse.example/problems/authentication-required",
        status: 401,
      });
      expect(create).not.toHaveBeenCalled();
      expect(findByCaseId).not.toHaveBeenCalled();
    });
  });

  test("uses verified JWT context for Tax Plan Cycle creates and reads", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: cycle.id,
    }));
    const findByCaseId = vi.fn<TaxPlanCycleCreateController["findByCaseId"]>(() => cycle);
    const token = await createAccessToken();

    await withProtectedTaxPlanCycleServer({ create, findByCaseId }, async (baseUrl) => {
      const createResponse = await fetch(`${baseUrl}/tax-plan-cycles`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(validCreateBody),
      });
      const readResponse = await fetch(`${baseUrl}/tax-plan-cycles/${cycle.id}`, {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(createResponse.status).toBe(202);
      expect(readResponse.status).toBe(200);
      expect(create).toHaveBeenCalledWith({
        ...validCreateBody,
        tenantId: "tenant-from-jwt",
        actor: "user-from-jwt",
      });
      expect(findByCaseId).toHaveBeenCalledWith({
        tenantId: "tenant-from-jwt",
        caseId: cycle.id,
      });
    });
  });
});
