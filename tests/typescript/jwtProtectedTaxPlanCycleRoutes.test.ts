import { once } from "node:events";
import type { AddressInfo } from "node:net";

import type { RequestHandler } from "express";
import { SignJWT } from "jose";
import { describe, expect, test, vi } from "vitest";

import {
  TAXPULSE_COST_UNITS_HEADER,
  createApp,
  createCostAccountingMiddleware,
  createJwtAuthenticationMiddleware,
  createLogger,
  createTenantRateLimitMiddleware,
  createTaxPlanCycleRouter,
  redactedAuditAmount,
  type AuditEntryReader,
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

async function createAccessToken(tenantId = "tenant-from-jwt"): Promise<string> {
  return await new SignJWT({
    role: "Advisor",
    tenant_id: tenantId,
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
  options: {
    auditEntryReader?: AuditEntryReader;
    costAccountingMiddleware?: RequestHandler;
    rateLimitMiddleware?: RequestHandler;
  } = {},
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (server) => {
      server.use(
        "/v1/tax-plan-cycles",
        createJwtAuthenticationMiddleware({ config }),
      );
      if (options.costAccountingMiddleware) {
        server.use("/v1/tax-plan-cycles", options.costAccountingMiddleware);
      }
      if (options.rateLimitMiddleware) {
        server.use("/v1/tax-plan-cycles", options.rateLimitMiddleware);
      }
      server.use(
        "/v1",
        createTaxPlanCycleRouter({
          auditEntryReader: options.auditEntryReader,
          controller,
        }),
      );
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

describe("JWT-protected Tax Plan Cycle routes", () => {
  test("rejects an unauthenticated operational request before the controller runs", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: cycle.id,
    }));
    const findByCaseId = vi.fn<TaxPlanCycleCreateController["findByCaseId"]>(() => cycle);

    await withProtectedTaxPlanCycleServer({ create, findByCaseId }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/v1/tax-plan-cycles`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validCreateBody),
      });
      const auditResponse = await fetch(
        `${baseUrl}/v1/tax-plan-cycles/${cycle.id}/audit-entries`,
      );

      expect(response.status).toBe(401);
      expect(auditResponse.status).toBe(401);
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
    const listByCase = vi.fn<AuditEntryReader["listByCase"]>(() =>
      Promise.resolve([
        {
          id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71",
          case_id: cycle.id,
          actor: "advisor-001",
          action: `income amount ${redactedAuditAmount} recorded`,
          outcome: "succeeded",
          occurred_at: "2026-07-20T14:00:00.000Z",
        },
      ]),
    );
    const token = await createAccessToken();

    await withProtectedTaxPlanCycleServer({ create, findByCaseId }, async (baseUrl) => {
      const createResponse = await fetch(`${baseUrl}/v1/tax-plan-cycles`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(validCreateBody),
      });
      const readResponse = await fetch(`${baseUrl}/v1/tax-plan-cycles/${cycle.id}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const auditResponse = await fetch(
        `${baseUrl}/v1/tax-plan-cycles/${cycle.id}/audit-entries`,
        { headers: { authorization: `Bearer ${token}` } },
      );

      expect(createResponse.status).toBe(202);
      expect(readResponse.status).toBe(200);
      expect(auditResponse.status).toBe(200);
      expect(create).toHaveBeenCalledWith({
        ...validCreateBody,
        tenantId: "tenant-from-jwt",
        actor: "user-from-jwt",
      });
      expect(findByCaseId).toHaveBeenCalledWith({
        tenantId: "tenant-from-jwt",
        caseId: cycle.id,
      });
      expect(listByCase).toHaveBeenCalledWith({
        tenantId: "tenant-from-jwt",
        caseId: cycle.id,
      });
    }, { auditEntryReader: { listByCase } });
  });

  test("emits operation-specific cost headers for protected Tax Plan Cycle requests", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: cycle.id,
    }));
    const findByCaseId = vi.fn<TaxPlanCycleCreateController["findByCaseId"]>(() => cycle);
    const token = await createAccessToken();

    await withProtectedTaxPlanCycleServer(
      { create, findByCaseId },
      async (baseUrl) => {
        const createResponse = await fetch(`${baseUrl}/v1/tax-plan-cycles`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(validCreateBody),
        });
        const readResponse = await fetch(`${baseUrl}/v1/tax-plan-cycles/${cycle.id}`, {
          headers: { authorization: `Bearer ${token}` },
        });

        expect(createResponse.status).toBe(202);
        expect(createResponse.headers.get(TAXPULSE_COST_UNITS_HEADER)).toBe("2");
        expect(readResponse.status).toBe(200);
        expect(readResponse.headers.get(TAXPULSE_COST_UNITS_HEADER)).toBe("1");
      },
      { costAccountingMiddleware: createCostAccountingMiddleware() },
    );
  });

  test("rate limits Tax Plan Cycle requests using the verified JWT tenant claim", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: cycle.id,
    }));
    const findByCaseId = vi.fn<TaxPlanCycleCreateController["findByCaseId"]>(() => cycle);
    const tenantAToken = await createAccessToken("tenant-rate-a");
    const tenantBToken = await createAccessToken("tenant-rate-b");

    await withProtectedTaxPlanCycleServer(
      { create, findByCaseId },
      async (baseUrl) => {
        const requestBody = JSON.stringify(validCreateBody);
        const tenantAFirst = await fetch(`${baseUrl}/v1/tax-plan-cycles`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${tenantAToken}`,
            "content-type": "application/json",
          },
          body: requestBody,
        });
        const tenantASecond = await fetch(`${baseUrl}/v1/tax-plan-cycles`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${tenantAToken}`,
            "content-type": "application/json",
          },
          body: requestBody,
        });
        const tenantBFirst = await fetch(`${baseUrl}/v1/tax-plan-cycles`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${tenantBToken}`,
            "content-type": "application/json",
          },
          body: requestBody,
        });

        expect(tenantAFirst.status).toBe(202);
        expect(tenantASecond.status).toBe(429);
        expect(tenantASecond.headers.get(TAXPULSE_COST_UNITS_HEADER)).toBe("2");
        expect(tenantASecond.headers.get("retry-after")).toBeDefined();
        await expect(tenantASecond.json()).resolves.toMatchObject({
          type: "https://taxpulse.example/problems/rate-limit-exceeded",
          status: 429,
        });
        expect(tenantBFirst.status).toBe(202);
        expect(create).toHaveBeenCalledWith({
          ...validCreateBody,
          tenantId: "tenant-rate-b",
          actor: "user-from-jwt",
        });
      },
      {
        costAccountingMiddleware: createCostAccountingMiddleware(),
        rateLimitMiddleware: createTenantRateLimitMiddleware({
          limit: 1,
          windowMs: 60_000,
        }),
      },
    );
  });
});
