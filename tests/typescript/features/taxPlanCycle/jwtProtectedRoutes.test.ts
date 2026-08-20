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
  hydrateUserClaims,
  createLogger,
  createTenantRateLimitMiddleware,
  createTaxPlanCycleRouter,
  type AuditEntryReader,
  type ActionItemRepository,
  type JwtConfig,
  type ScenarioRepository,
  type TaxPlanCycle,
  type TaxPlanCycleCreateController,
  type TaxPlanCycleCreateInput,
  type TaxPlanCycleRepository,
} from "../../../../src/typescript/index.js";

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

async function createAccessToken({
  tenantId = "tenant-from-jwt",
  userId = "user-from-jwt",
  role = "Advisor",
}: {
  tenantId?: string;
  userId?: string;
  role?: "Firm Admin" | "Advisor" | "Client" | "TaxPulse Platform Admin";
} = {}): Promise<string> {
  return await new SignJWT({
    role,
    tenant_id: tenantId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(config.issuer)
    .setExpirationTime("15m")
    .sign(new TextEncoder().encode(config.signingSecret));
}

async function withProtectedTaxPlanCycleServer(
  controller: TaxPlanCycleCreateController,
  run: (baseUrl: string) => Promise<void>,
  options: {
    auditEntryReader?: AuditEntryReader;
    clientPortalReadRepository?: Pick<TaxPlanCycleRepository, "findCurrentByClientId">;
    scenarioRepository?: Pick<ScenarioRepository, "listByCaseId">;
    actionItemRepository?: Pick<ActionItemRepository, "listByCaseId" | "complete">;
    actionItemCompletedEventPublisher?: {
      publishActionItemCompleted(input: {
        tenantId: string;
        caseId: string;
        actionItemId: number;
        actor: string;
      }): Promise<void> | void;
    };
    costAccountingMiddleware?: RequestHandler;
    rateLimitMiddleware?: RequestHandler;
  } = {},
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (server) => {
      server.use(
        "/v1",
        createJwtAuthenticationMiddleware({ config }),
      );
      server.use(
        "/v1",
        hydrateUserClaims(),
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
          clientPortalReadRepository: options.clientPortalReadRepository,
          scenarioRepository: options.scenarioRepository,
          actionItemRepository: options.actionItemRepository,
          actionItemCompletedEventPublisher: options.actionItemCompletedEventPublisher,
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
    const auditEntries = [
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e71",
        case_id: cycle.id,
        actor: "advisor-001",
        action: "income amount redacted recorded",
        outcome: "succeeded",
        occurred_at: "2026-07-20T14:00:00.000Z",
      },
    ];
    const listByCase = vi.fn<AuditEntryReader["listByCase"]>(() =>
      Promise.resolve(auditEntries),
    );
    const token = await createAccessToken();

    await withProtectedTaxPlanCycleServer({ create, findByCaseId }, async (baseUrl) => {
      const createResponse = await fetch(`${baseUrl}/v1/tax-plan-cycles`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "Idempotency-Key": "jwt-create-key-001",
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
      await expect(readResponse.json()).resolves.toEqual(cycle);
      await expect(auditResponse.json()).resolves.toEqual({
        audit_entries: auditEntries,
      });
      expect(create).toHaveBeenCalledWith({
        ...validCreateBody,
        tenantId: "tenant-from-jwt",
        actor: "user-from-jwt",
        idempotencyKey: "jwt-create-key-001",
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

  test("answers CORS preflight requests for the protected Tax Plan Cycle read endpoint", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: cycle.id,
    }));
    const findByCaseId = vi.fn<TaxPlanCycleCreateController["findByCaseId"]>(() => cycle);

    await withProtectedTaxPlanCycleServer({ create, findByCaseId }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/v1/tax-plan-cycles/${cycle.id}`, {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:5173",
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "Authorization, Content-Type",
        },
      });

      expect(response.status).toBe(204);
      expect(response.headers.get("access-control-allow-origin")).toBe("*");
      expect(response.headers.get("access-control-allow-methods")).toBe(
        "GET,POST,PATCH,PUT,DELETE,OPTIONS",
      );
      expect(response.headers.get("access-control-allow-headers")).toBe(
        "Authorization, Content-Type, Idempotency-Key",
      );
      expect(response.headers.get("access-control-max-age")).toBe("600");
      expect(create).not.toHaveBeenCalled();
      expect(findByCaseId).not.toHaveBeenCalled();
    });
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
            "Idempotency-Key": "jwt-create-key-002",
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
    const tenantAToken = await createAccessToken({ tenantId: "tenant-rate-a" });
    const tenantBToken = await createAccessToken({ tenantId: "tenant-rate-b" });

    await withProtectedTaxPlanCycleServer(
      { create, findByCaseId },
      async (baseUrl) => {
        const requestBody = JSON.stringify(validCreateBody);
        const tenantAFirst = await fetch(`${baseUrl}/v1/tax-plan-cycles`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${tenantAToken}`,
            "content-type": "application/json",
            "Idempotency-Key": "rate-limit-key-a-001",
          },
          body: requestBody,
        });
        const tenantASecond = await fetch(`${baseUrl}/v1/tax-plan-cycles`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${tenantAToken}`,
            "content-type": "application/json",
            "Idempotency-Key": "rate-limit-key-a-002",
          },
          body: requestBody,
        });
        const tenantBFirst = await fetch(`${baseUrl}/v1/tax-plan-cycles`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${tenantBToken}`,
            "content-type": "application/json",
            "Idempotency-Key": "rate-limit-key-b-001",
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
          idempotencyKey: "rate-limit-key-b-001",
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

  test("scopes client portal and direct cycle reads to the JWT client ID", async () => {
    const clientId = validCreateBody.client_id;
    const otherClientCycle: TaxPlanCycle = {
      ...cycle,
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e02",
      client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e12",
    };
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({ case_id: cycle.id }));
    const findByCaseId = vi.fn<TaxPlanCycleCreateController["findByCaseId"]>(
      async () => otherClientCycle,
    );
    const findCurrentByClientId = vi.fn(async () => cycle);
    const listByCaseId = vi.fn(async () => [
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e31",
        case_id: cycle.id,
        name: "Increase retirement contributions",
        typed_figures: {
          income: 250_000,
          deductions: 30_000,
          state: "NY",
          filing_status: "married_filing_jointly" as const,
        },
        computed_result: {
          totalTax: "72100",
          deltaVBaseline: "-4500",
        },
        created_at: "2026-08-12T14:00:00.000Z",
      },
    ]);
    const token = await createAccessToken({ role: "Client", userId: clientId });

    await withProtectedTaxPlanCycleServer(
      { create, findByCaseId },
      async (baseUrl) => {
        const portalResponse = await fetch(`${baseUrl}/v1/portal/my-tax-plan`, {
          headers: { authorization: `Bearer ${token}` },
        });
        const directResponse = await fetch(
          `${baseUrl}/v1/tax-plan-cycles/${otherClientCycle.id}`,
          { headers: { authorization: `Bearer ${token}` } },
        );

        expect(portalResponse.status).toBe(200);
        await expect(portalResponse.json()).resolves.toEqual({
          ...cycle,
          advisor: cycle.owner,
          next_meeting: null,
          projected_savings: null,
          top_recommendation: null,
          scenarios: [
            {
              id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e31",
              name: "Increase retirement contributions",
              total_tax: 72_100,
              delta_vs_baseline: -4_500,
            },
          ],
        });
        expect(findCurrentByClientId).toHaveBeenCalledWith({
          tenantId: "tenant-from-jwt",
          clientId,
        });
        expect(listByCaseId).toHaveBeenCalledWith({
          tenantId: "tenant-from-jwt",
          caseId: cycle.id,
        });
        expect(directResponse.status).toBe(403);
        await expect(directResponse.json()).resolves.toMatchObject({
          title: "Operator Access Required",
        });
      },
      {
        clientPortalReadRepository: { findCurrentByClientId },
        scenarioRepository: { listByCaseId },
      },
    );
  });

  test("does not expose the tenant-wide cycle queue to a Client user", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({ case_id: cycle.id }));
    const findByCaseId = vi.fn<TaxPlanCycleCreateController["findByCaseId"]>(() => cycle);
    const token = await createAccessToken({
      role: "Client",
      userId: validCreateBody.client_id,
    });

    await withProtectedTaxPlanCycleServer({ create, findByCaseId }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/v1/tax-plan-cycles`, {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toMatchObject({
        title: "Operator Access Required",
      });
    });
  });

  test("lists and completes only the authenticated client's action items, then emits an event", async () => {
    const clientId = validCreateBody.client_id;
    const token = await createAccessToken({ role: "Client", userId: clientId });
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({ case_id: cycle.id }));
    const findByCaseId = vi.fn<TaxPlanCycleCreateController["findByCaseId"]>(() => cycle);
    const item = {
      id: 42,
      case_id: cycle.id,
      description: "Make the estimated tax payment",
      deadline: "2026-09-15",
      completed: false,
    };
    const listByCaseId = vi.fn(async () => [item]);
    const complete = vi.fn(async () => ({ ...item, completed: true }));
    const publishActionItemCompleted = vi.fn();

    await withProtectedTaxPlanCycleServer(
      { create, findByCaseId },
      async (baseUrl) => {
        const listResponse = await fetch(`${baseUrl}/v1/portal/action-items`, {
          headers: { authorization: `Bearer ${token}` },
        });
        const completeResponse = await fetch(`${baseUrl}/v1/portal/action-items/42/complete`, {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
        });

        expect(listResponse.status).toBe(200);
        await expect(listResponse.json()).resolves.toEqual([item]);
        expect(completeResponse.status).toBe(200);
        await expect(completeResponse.json()).resolves.toEqual({ ...item, completed: true });
        expect(listByCaseId).toHaveBeenCalledWith(cycle.id);
        expect(complete).toHaveBeenCalledWith({ caseId: cycle.id, actionItemId: 42 });
        expect(publishActionItemCompleted).toHaveBeenCalledWith({
          tenantId: "tenant-from-jwt",
          caseId: cycle.id,
          actionItemId: 42,
          actor: clientId,
        });
      },
      {
        clientPortalReadRepository: { findCurrentByClientId: async () => cycle },
        actionItemRepository: { listByCaseId, complete },
        actionItemCompletedEventPublisher: { publishActionItemCompleted },
      },
    );
  });
});
