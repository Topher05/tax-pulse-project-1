import { once } from "node:events";
import type { AddressInfo } from "node:net";

import type { RequestHandler } from "express";
import { describe, expect, test, vi } from "vitest";

import {
  ProblemHttpError,
  createApp,
  createJwtAuthenticationMiddleware,
  createLogger,
  createTaxPlanCycleRouter,
  type JwtConfig,
  redactedAuditAmount,
  type TaxPlanCycle,
  type TaxPlanCycleCreateController,
  type TaxPlanCycleCreateInput,
  type TaxPlanCycleTransitionController,
  type AuditEntryOutput,
  type AuditEntryReader,
  type AuditEntryWriter,
  type ValidationErrorResponse,
} from "../../../../src/typescript/index.js";
import {
  createScenarioModelingController,
  type ScenarioModelingController,
  type TaxEngineClient,
} from "../../../../src/typescript/features/taxPlanCycle/index.js";
import {
  hydrateUserClaims,
  obtainAccessTokenViaLoginAndMfa,
} from "../../bootstrap/authFlow.js";

const silentLogger = createLogger({ level: "silent" });
const authConfig: JwtConfig = {
  issuer: "https://auth.taxpulse.example",
  signingSecret: "a-unique-test-secret-that-is-more-than-32-bytes",
  accessTokenLifetimeSeconds: 900,
  refreshTokenLifetimeSeconds: 2_592_000,
};

const validCreateBody: TaxPlanCycleCreateInput = {
  client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
  planning_period: "2026-Q4",
  owner: "advisor-123",
  priority: "high",
  due_date: "2026-12-31",
};

const validReadCycle: TaxPlanCycle = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
  client_id: validCreateBody.client_id,
  stage: "Review",
  owner: validCreateBody.owner,
  priority: validCreateBody.priority,
  due_date: validCreateBody.due_date,
  on_hold: false,
};

async function createAccessToken(input: {
  tenantId: string;
  userId: string;
  email: string;
  role: "Firm Admin" | "Advisor" | "Client" | "TaxPulse Platform Admin";
  password: string;
  totpSecret: string;
  totpCode: string;
}): Promise<string> {
  const result = await obtainAccessTokenViaLoginAndMfa({
    config: authConfig,
    principal: {
      tenantId: input.tenantId,
      userId: input.userId,
      email: input.email,
      role: input.role,
      password: input.password,
      totpSecret: input.totpSecret,
      totpCode: input.totpCode,
    },
  });

  return result.access_token;
}

async function withRouteServer(
  controller: TaxPlanCycleCreateController,
  auditEntryReader: AuditEntryReader | undefined,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (app) => {
      app.use(createJwtAuthenticationMiddleware({ config: authConfig }));
      app.use(createTaxPlanCycleRouter({ auditEntryReader, controller }));
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

async function withScenarioRouteServer(
  scenarioModelingController: ScenarioModelingController,
  requestContext: { tenantId: string; userId: string },
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (app) => {
      app.use((req, _res, next) => {
        (req as typeof req & { tenant: { id: string } }).tenant = {
          id: requestContext.tenantId,
        };
        (req as typeof req & { user: { id: string } }).user = {
          id: requestContext.userId,
        };
        next();
      });
      app.use(
        "/v1",
        createTaxPlanCycleRouter({
          controller: {
            create: vi.fn(),
            findByCaseId: vi.fn(async () => null),
          },
          scenarioModelingController,
        }),
      );
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

async function withTransitionRouteServer(
  options: {
    controller: TaxPlanCycleCreateController;
    transitionController: TaxPlanCycleTransitionController;
    auditEntryWriter: AuditEntryWriter;
    auditLogger: Pick<Console, "info">;
    permissionsForRole?: Partial<
      Record<"Firm Admin" | "Advisor" | "Client" | "TaxPulse Platform Admin", ReadonlyArray<string>>
    >;
  },
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (app) => {
      app.use(createJwtAuthenticationMiddleware({ config: authConfig }));
      app.use(hydrateUserClaims(options.permissionsForRole));
      app.use(
        createTaxPlanCycleRouter({
          controller: options.controller,
          transitionController: options.transitionController,
          auditEntryWriter: options.auditEntryWriter,
          auditLogger: options.auditLogger,
        }),
      );
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

async function withTransitionRouteServerWithoutAuth(
  options: {
    controller: TaxPlanCycleCreateController;
    transitionController: TaxPlanCycleTransitionController;
    auditEntryWriter: AuditEntryWriter;
    auditLogger: Pick<Console, "info">;
  },
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (app) => {
      app.use(
        createTaxPlanCycleRouter({
          controller: options.controller,
          transitionController: options.transitionController,
          auditEntryWriter: options.auditEntryWriter,
          auditLogger: options.auditLogger,
        }),
      );
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

describe("createTaxPlanCycleRouter", () => {
  test("returns 400 Problem Details for malformed creates", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
    }));
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => null);

    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "actor-001",
      email: "actor@example.com",
      role: "Advisor",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withRouteServer({ create, findByCaseId }, undefined, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/tax-plan-cycles`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...validCreateBody,
          stage: "Unknown",
          owner: "",
        }),
      });
      const body = (await response.json()) as ValidationErrorResponse;

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
          expect.objectContaining({ path: ["owner"] }),
          expect.objectContaining({ code: "unrecognized_keys" }),
        ]),
      );
      expect(create).not.toHaveBeenCalled();
    });
  });

  test("passes valid creates to the controller layer", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
    }));
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => null);

    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "actor-001",
      email: "actor@example.com",
      role: "Advisor",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withRouteServer({ create, findByCaseId }, undefined, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/tax-plan-cycles`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          "Idempotency-Key": "create-cycle-key-000",
        },
        body: JSON.stringify(validCreateBody),
      });

      expect(response.status).toBe(202);
      await expect(response.json()).resolves.toEqual({
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
      });
      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith({
        ...validCreateBody,
        tenantId: "tenant-001",
        actor: "actor-001",
        idempotencyKey: "create-cycle-key-000",
      });
    });
  });

  test("returns 400 Problem Details when the Idempotency-Key header is missing", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
    }));
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => null);
    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "actor-001",
      email: "actor@example.com",
      role: "Advisor",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withRouteServer({ create, findByCaseId }, undefined, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/tax-plan-cycles`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(validCreateBody),
      });

      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      await expect(response.json()).resolves.toEqual({
        type: "https://taxpulse.example/problems/idempotency-key-required",
        title: "Idempotency Key Required",
        status: 400,
        detail: "A non-empty Idempotency-Key header is required to create a Tax Plan Cycle.",
      });
      expect(create).not.toHaveBeenCalled();
    });
  });

  test("returns 400 Problem Details when the Idempotency-Key header is blank", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
    }));
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => null);
    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "actor-001",
      email: "actor@example.com",
      role: "Advisor",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withRouteServer({ create, findByCaseId }, undefined, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/tax-plan-cycles`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          "Idempotency-Key": "   ",
        },
        body: JSON.stringify(validCreateBody),
      });

      expect(response.status).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });
  });

  test("passes a non-empty Idempotency-Key header to the controller layer", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
    }));
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => null);
    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "actor-001",
      email: "actor@example.com",
      role: "Advisor",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withRouteServer({ create, findByCaseId }, undefined, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/tax-plan-cycles`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          "Idempotency-Key": " create-cycle-key-001 ",
        },
        body: JSON.stringify(validCreateBody),
      });

      expect(response.status).toBe(202);
      await expect(response.json()).resolves.toEqual({
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
      });
      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith({
        ...validCreateBody,
        tenantId: "tenant-001",
        actor: "actor-001",
        idempotencyKey: "create-cycle-key-001",
      });
    });
  });

  test("returns shared Problem Details when the controller rejects a create", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => {
      throw new ProblemHttpError({
        type: "https://taxpulse.example/problems/cycle-conflict",
        title: "Cycle Conflict",
        status: 409,
        detail: "The requested tax plan cycle is already locked.",
      });
    });
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => null);

    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "actor-001",
      email: "actor@example.com",
      role: "Advisor",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withRouteServer({ create, findByCaseId }, undefined, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/tax-plan-cycles`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          "Idempotency-Key": "create-cycle-key-409",
        },
        body: JSON.stringify(validCreateBody),
      });

      expect(response.status).toBe(409);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      await expect(response.json()).resolves.toEqual({
        type: "https://taxpulse.example/problems/cycle-conflict",
        title: "Cycle Conflict",
        status: 409,
        detail: "The requested tax plan cycle is already locked.",
      });
      expect(create).toHaveBeenCalledTimes(1);
    });
  });

  test("returns 502 Problem Details and leaves the case intact when scenario modeling fails", async () => {
    const caseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e77";
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: caseId,
    }));
    const findByCaseId = vi.fn(async () => ({
      id: caseId,
      client_id: validCreateBody.client_id,
      stage: "Modeling" as const,
      owner: validCreateBody.owner,
      priority: validCreateBody.priority,
      due_date: validCreateBody.due_date,
      on_hold: false,
    })) as ReturnType<typeof vi.fn> & TaxPlanCycleCreateController["findByCaseId"];
    const scenarioRepository = {
      createMany: vi.fn(),
      listByCaseId: vi.fn(async () => []),
    };
    const taxEngineClient: TaxEngineClient = {
      compareScenarios: vi.fn(async () => {
        throw new Error("connect ECONNREFUSED 127.0.0.1:8000");
      }),
    };
    const scenarioModelingController = createScenarioModelingController({
      taxPlanCycleRepository: { findByCaseId },
      scenarioRepository,
      taxEngineClient,
    });

    await withScenarioRouteServer(
      scenarioModelingController,
      { tenantId: "tenant-001", userId: "actor-001" },
      async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/v1/tax-plan-cycles/${caseId}/scenarios`,
          {
            method: "POST",
            headers: {
              authorization: "Bearer test-token",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              baseline: {
                income: 250_000,
                deductions: 30_000,
                state: "CA",
                filing_status: "married_filing_jointly",
              },
              scenarios: [
                {
                  name: "Increase deductions",
                  typed_figures: {
                    income: 250_000,
                    deductions: 36_000,
                    state: "CA",
                    filing_status: "married_filing_jointly",
                  },
                },
                {
                  name: "Keep baseline",
                  typed_figures: {
                    income: 250_000,
                    deductions: 30_000,
                    state: "CA",
                    filing_status: "married_filing_jointly",
                  },
                },
              ],
            }),
          },
        );
        const body = (await response.json()) as ValidationErrorResponse;

        expect(response.status).toBe(502);
        expect(response.headers.get("content-type")).toContain(
          "application/problem+json",
        );
        expect(body).toMatchObject({
          type: "https://taxpulse.example/problems/tax-engine-unavailable",
          title: "Tax Engine Unavailable",
          status: 502,
          detail: "The liability engine request failed after retries.",
        });
        expect(scenarioRepository.createMany).not.toHaveBeenCalled();
        expect(scenarioRepository.listByCaseId).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
      },
    );
  });

  test("returns a tenant-scoped cycle by case ID", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
    }));
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => validReadCycle);

    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "actor-001",
      email: "actor@example.com",
      role: "Advisor",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withRouteServer({ create, findByCaseId }, undefined, async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/tax-plan-cycles/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01`,
        { headers: { authorization: `Bearer ${accessToken}` } },
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(validReadCycle);
      expect(findByCaseId).toHaveBeenCalledTimes(1);
      expect(findByCaseId).toHaveBeenCalledWith({
        tenantId: "tenant-001",
        caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
      });
      expect(create).not.toHaveBeenCalled();
    });
  });

  test("returns 404 Problem Details for an unknown case ID", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
    }));
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => null);

    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "actor-001",
      email: "actor@example.com",
      role: "Advisor",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withRouteServer({ create, findByCaseId }, undefined, async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/tax-plan-cycles/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e02`,
        { headers: { authorization: `Bearer ${accessToken}` } },
      );

      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      await expect(response.json()).resolves.toEqual({
        type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
        title: "Tax Plan Cycle Not Found",
        status: 404,
        detail: "No tax plan cycle was found for the requested case ID.",
      });
      expect(findByCaseId).toHaveBeenCalledWith({
        tenantId: "tenant-001",
        caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e02",
      });
    });
  });

  test("returns 404 when a case exists outside the request tenant", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
    }));
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => null);

    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "actor-001",
      email: "actor@example.com",
      role: "Advisor",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withRouteServer({ create, findByCaseId }, undefined, async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/tax-plan-cycles/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e03`,
        { headers: { authorization: `Bearer ${accessToken}` } },
      );

      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      expect(findByCaseId).toHaveBeenCalledWith({
        tenantId: "tenant-001",
        caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e03",
      });
    });
  });

  test("returns 400 Problem Details for an invalid case ID path parameter", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
    }));
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => validReadCycle);

    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "actor-001",
      email: "actor@example.com",
      role: "Advisor",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withRouteServer({ create, findByCaseId }, undefined, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/tax-plan-cycles/%20`, {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const body = (await response.json()) as ValidationErrorResponse;

      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      expect(body).toMatchObject({
        type: "https://taxpulse.example/problems/validation-error",
        title: "Validation Error",
        status: 400,
        detail: "Request path parameters failed validation.",
        code: "VALIDATION_ERROR",
      });
      expect(body.issues).toEqual([
        expect.objectContaining({ path: ["caseId"] }),
      ]);
      expect(findByCaseId).not.toHaveBeenCalled();
    });
  });

  test("returns redacted audit output for a tenant-scoped case", async () => {
    const auditEntry: AuditEntryOutput = {
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71",
      case_id: validReadCycle.id,
      actor: "advisor-001",
      action: `income amount ${redactedAuditAmount} recorded`,
      outcome: `deduction amount ${redactedAuditAmount} accepted`,
      occurred_at: "2026-07-20T14:00:00.000Z",
    };
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: validReadCycle.id,
    }));
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => validReadCycle);
    const listByCase = vi.fn<AuditEntryReader["listByCase"]>(() =>
      Promise.resolve([auditEntry]),
    );

    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "actor-001",
      email: "actor@example.com",
      role: "Advisor",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withRouteServer(
      { create, findByCaseId },
      { listByCase },
      async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/tax-plan-cycles/${validReadCycle.id}/audit-entries`,
          { headers: { authorization: `Bearer ${accessToken}` } },
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
          audit_entries: [auditEntry],
        });
        expect(findByCaseId).toHaveBeenCalledWith({
          tenantId: "tenant-001",
          caseId: validReadCycle.id,
        });
        expect(listByCase).toHaveBeenCalledWith({
          tenantId: "tenant-001",
          caseId: validReadCycle.id,
        });
        expect(create).not.toHaveBeenCalled();
      },
    );
  });

  test("does not read audit entries for an unknown or cross-tenant case", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: validReadCycle.id,
    }));
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => null);
    const listByCase = vi.fn<AuditEntryReader["listByCase"]>(() =>
      Promise.resolve([]),
    );

    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "actor-001",
      email: "actor@example.com",
      role: "Advisor",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withRouteServer(
      { create, findByCaseId },
      { listByCase },
      async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/tax-plan-cycles/${validReadCycle.id}/audit-entries`,
          { headers: { authorization: `Bearer ${accessToken}` } },
        );

        expect(response.status).toBe(404);
        expect(listByCase).not.toHaveBeenCalled();
      },
    );
  });
});

describe("transitionTaxPlanCycleRouter", () => {
  const reviewCycle: TaxPlanCycle = {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e51",
    client_id: validCreateBody.client_id,
    stage: "Review",
    owner: validCreateBody.owner,
    priority: validCreateBody.priority,
    due_date: validCreateBody.due_date,
    on_hold: false,
  };

  const dataAggregationCycle: TaxPlanCycle = {
    ...reviewCycle,
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e52",
    stage: "Data Aggregation",
  };

  const intakeCycle: TaxPlanCycle = {
    ...reviewCycle,
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e53",
    stage: "Intake",
  };

  test("allows Firm Admins to transition review-stage cycles", async () => {
    const updatedCycle: TaxPlanCycle = {
      ...reviewCycle,
      stage: "Client Approval",
    };
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: updatedCycle.id,
    }));
    const findByCaseId = vi.fn<TaxPlanCycleCreateController["findByCaseId"]>(
      () => reviewCycle,
    );
    const transition = vi.fn<TaxPlanCycleTransitionController["transition"]>(
      () => updatedCycle,
    );
    const auditLogger = { info: vi.fn() };
    const auditWriter = { record: vi.fn() };
    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "firm-admin-001",
      email: "firm-admin@example.com",
      role: "Firm Admin",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withTransitionRouteServer(
      {
        controller: { create, findByCaseId },
        transitionController: { transition, findByCaseId },
        auditEntryWriter: auditWriter,
        auditLogger,
      },
      async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/tax-plan-cycles/${reviewCycle.id}/transition`,
          {
            method: "PATCH",
            headers: {
              authorization: `Bearer ${accessToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({ to_stage: "Client Approval" }),
          },
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual(updatedCycle);
        expect(findByCaseId).toHaveBeenCalledWith({
          tenantId: "tenant-001",
          caseId: reviewCycle.id,
        });
        expect(transition).toHaveBeenCalledWith({
          tenantId: "tenant-001",
          caseId: reviewCycle.id,
          toStage: "Client Approval",
          actor: "firm-admin-001",
        });
        expect(auditLogger.info).not.toHaveBeenCalled();
        expect(auditWriter.record).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
      },
    );
  });

  test("allows Advisors with EDIT permission to transition non-review cycles", async () => {
    const updatedCycle: TaxPlanCycle = {
      ...dataAggregationCycle,
      stage: "Modeling",
    };
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: updatedCycle.id,
    }));
    const findByCaseId = vi.fn<TaxPlanCycleCreateController["findByCaseId"]>(
      () => dataAggregationCycle,
    );
    const transition = vi.fn<TaxPlanCycleTransitionController["transition"]>(
      () => updatedCycle,
    );
    const auditLogger = { info: vi.fn() };
    const auditWriter = { record: vi.fn() };
    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "advisor-edit-001",
      email: "advisor@example.com",
      role: "Advisor",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withTransitionRouteServer(
      {
        controller: { create, findByCaseId },
        transitionController: { transition, findByCaseId },
        auditEntryWriter: auditWriter,
        auditLogger,
      },
      async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/tax-plan-cycles/${dataAggregationCycle.id}/transition`,
          {
            method: "PATCH",
            headers: {
              authorization: `Bearer ${accessToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({ to_stage: "Modeling" }),
          },
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual(updatedCycle);
        expect(findByCaseId).toHaveBeenCalledWith({
          tenantId: "tenant-001",
          caseId: dataAggregationCycle.id,
        });
        expect(transition).toHaveBeenCalledWith({
          tenantId: "tenant-001",
          caseId: dataAggregationCycle.id,
          toStage: "Modeling",
          actor: "advisor-edit-001",
        });
        expect(auditLogger.info).not.toHaveBeenCalled();
        expect(auditWriter.record).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
      },
    );
  });

  test("returns 422 Problem Details when an authorized advisor requests an illegal transition", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: intakeCycle.id,
    }));
    const findByCaseId = vi.fn<TaxPlanCycleCreateController["findByCaseId"]>(
      () => intakeCycle,
    );
    const transition = vi.fn<TaxPlanCycleTransitionController["transition"]>(
      () => intakeCycle,
    );
    const auditLogger = { info: vi.fn() };
    const auditWriter = { record: vi.fn() };
    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "advisor-illegal-001",
      email: "advisor@example.com",
      role: "Advisor",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withTransitionRouteServer(
      {
        controller: { create, findByCaseId },
        transitionController: { transition, findByCaseId },
        auditEntryWriter: auditWriter,
        auditLogger,
      },
      async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/tax-plan-cycles/${intakeCycle.id}/transition`,
          {
            method: "PATCH",
            headers: {
              authorization: `Bearer ${accessToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({ to_stage: "Modeling" }),
          },
        );
        const body = (await response.json()) as ValidationErrorResponse;

        expect(response.status).toBe(422);
        expect(response.headers.get("content-type")).toContain(
          "application/problem+json",
        );
        expect(body).toMatchObject({
          type: "https://taxpulse.example/problems/invalid-transition",
          title: "Invalid Transition",
          status: 422,
          detail: "The requested stage transition is not legal.",
        });
        expect(auditLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            case_id: intakeCycle.id,
            actor: "advisor-illegal-001",
            action: "transition Intake -> Modeling",
            outcome: "422",
            occurred_at: expect.any(String),
          }),
        );
        expect(auditWriter.record).toHaveBeenCalledWith(
          expect.objectContaining({
            caseId: intakeCycle.id,
            actor: "advisor-illegal-001",
            action: "transition Intake -> Modeling",
            outcome: "422",
            occurredAt: expect.any(Date),
          }),
        );
        expect(transition).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
      },
    );
  });

  test("returns 403 Problem Details and logs denied unauthorized transitions", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: reviewCycle.id,
    }));
    const findByCaseId = vi.fn<TaxPlanCycleCreateController["findByCaseId"]>(
      () => reviewCycle,
    );
    const transition = vi.fn<TaxPlanCycleTransitionController["transition"]>(
      () => reviewCycle,
    );
    const auditLogger = { info: vi.fn() };
    const auditWriter = { record: vi.fn() };
    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "advisor-no-access-001",
      email: "advisor@example.com",
      role: "Advisor",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withTransitionRouteServer(
      {
        controller: { create, findByCaseId },
        transitionController: { transition, findByCaseId },
        auditEntryWriter: auditWriter,
        auditLogger,
        permissionsForRole: { Advisor: [] },
      },
      async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/tax-plan-cycles/${reviewCycle.id}/transition`,
          {
            method: "PATCH",
            headers: {
              authorization: `Bearer ${accessToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({ to_stage: "Client Approval" }),
          },
        );
        const body = (await response.json()) as ValidationErrorResponse;

        expect(response.status).toBe(403);
        expect(response.headers.get("content-type")).toContain(
          "application/problem+json",
        );
        expect(body).toMatchObject({
          type: "https://taxpulse.example/problems/forbidden-transition",
          title: "Forbidden",
          status: 403,
          detail:
            "The current role is not authorized to perform this transition.",
        });
        expect(auditLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            case_id: reviewCycle.id,
            actor: "advisor-no-access-001",
            action: "transition Review -> Client Approval",
            outcome: "403",
            occurred_at: expect.any(String),
          }),
        );
        expect(auditWriter.record).toHaveBeenCalledWith(
          expect.objectContaining({
            caseId: reviewCycle.id,
            actor: "advisor-no-access-001",
            action: "transition Review -> Client Approval",
            outcome: "403",
            occurredAt: expect.any(Date),
          }),
        );
        expect(transition).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
      },
    );
  });

  test("returns 422 Problem Details and logs denied illegal transitions", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: dataAggregationCycle.id,
    }));
    const findByCaseId = vi.fn<TaxPlanCycleCreateController["findByCaseId"]>(
      () => dataAggregationCycle,
    );
    const transition = vi.fn<TaxPlanCycleTransitionController["transition"]>(
      () => dataAggregationCycle,
    );
    const auditLogger = { info: vi.fn() };
    const auditWriter = { record: vi.fn() };
    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "advisor-edit-002",
      email: "advisor@example.com",
      role: "Advisor",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withTransitionRouteServer(
      {
        controller: { create, findByCaseId },
        transitionController: { transition, findByCaseId },
        auditEntryWriter: auditWriter,
        auditLogger,
      },
      async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/tax-plan-cycles/${dataAggregationCycle.id}/transition`,
          {
            method: "PATCH",
            headers: {
              authorization: `Bearer ${accessToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({ to_stage: "Archived" }),
          },
        );
        const body = (await response.json()) as ValidationErrorResponse;

        expect(response.status).toBe(422);
        expect(response.headers.get("content-type")).toContain(
          "application/problem+json",
        );
        expect(body).toMatchObject({
          type: "https://taxpulse.example/problems/invalid-transition",
          title: "Invalid Transition",
          status: 422,
          detail: "The requested stage transition is not legal.",
        });
        expect(auditLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            case_id: dataAggregationCycle.id,
            actor: "advisor-edit-002",
            action: "transition Data Aggregation -> Archived",
            outcome: "422",
            occurred_at: expect.any(String),
          }),
        );
        expect(auditWriter.record).toHaveBeenCalledWith(
          expect.objectContaining({
            caseId: dataAggregationCycle.id,
            actor: "advisor-edit-002",
            action: "transition Data Aggregation -> Archived",
            outcome: "422",
            occurredAt: expect.any(Date),
          }),
        );
        expect(transition).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
      },
    );
  });

  test("returns 400 Problem Details for malformed transition requests", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: dataAggregationCycle.id,
    }));
    const findByCaseId = vi.fn<TaxPlanCycleCreateController["findByCaseId"]>(
      () => dataAggregationCycle,
    );
    const transition = vi.fn<TaxPlanCycleTransitionController["transition"]>(
      () => dataAggregationCycle,
    );
    const auditLogger = { info: vi.fn() };
    const auditWriter = { record: vi.fn() };
    const accessToken = await createAccessToken({
      tenantId: "tenant-001",
      userId: "advisor-edit-003",
      email: "advisor@example.com",
      role: "Advisor",
      password: "correct-password",
      totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      totpCode: "123456",
    });

    await withTransitionRouteServer(
      {
        controller: { create, findByCaseId },
        transitionController: { transition, findByCaseId },
        auditEntryWriter: auditWriter,
        auditLogger,
      },
      async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/tax-plan-cycles/${dataAggregationCycle.id}/transition`,
          {
            method: "PATCH",
            headers: {
              authorization: `Bearer ${accessToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({ to_stage: "Unknown" }),
          },
        );
        const body = (await response.json()) as ValidationErrorResponse;

        expect(response.status).toBe(400);
        expect(response.headers.get("content-type")).toContain(
          "application/problem+json",
        );
        expect(body).toMatchObject({
          type: "https://taxpulse.example/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Transition request failed validation.",
          code: "VALIDATION_ERROR",
        });
        expect(findByCaseId).not.toHaveBeenCalled();
        expect(transition).not.toHaveBeenCalled();
        expect(auditLogger.info).not.toHaveBeenCalled();
        expect(auditWriter.record).not.toHaveBeenCalled();
      },
    );
  });

  test("returns 401 Problem Details when patching without auth context", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      case_id: dataAggregationCycle.id,
    }));
    const findByCaseId = vi.fn<TaxPlanCycleCreateController["findByCaseId"]>(
      () => dataAggregationCycle,
    );
    const transition = vi.fn<TaxPlanCycleTransitionController["transition"]>(
      () => dataAggregationCycle,
    );
    const auditLogger = { info: vi.fn() };
    const auditWriter = { record: vi.fn() };

    await withTransitionRouteServerWithoutAuth(
      {
        controller: { create, findByCaseId },
        transitionController: { transition, findByCaseId },
        auditEntryWriter: auditWriter,
        auditLogger,
      },
      async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/tax-plan-cycles/${dataAggregationCycle.id}/transition`,
          {
            method: "PATCH",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({ to_stage: "Modeling" }),
          },
        );

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toMatchObject({
          type: "https://taxpulse.example/problems/authentication-required",
          title: "Authentication Required",
          status: 401,
          detail: "A valid access token is required.",
        });
        expect(findByCaseId).not.toHaveBeenCalled();
        expect(transition).not.toHaveBeenCalled();
        expect(auditLogger.info).not.toHaveBeenCalled();
        expect(auditWriter.record).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
      },
    );
  });
});
