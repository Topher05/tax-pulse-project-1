import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createTestJwtFixture,
  signTestAccessToken,
  withJwksServer,
} from "../../bootstrap/jwtTestUtils.js";

const repository = vi.hoisted(() => ({
  create: vi.fn(async () => "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91"),
  insert: vi.fn(),
  findByCaseId: vi.fn(async () => ({
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
    client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
    stage: "Intake",
    owner: "postman-test-owner",
    priority: "high",
    due_date: "2026-12-31",
    on_hold: false,
  })),
  listQueue: vi.fn(),
}));
const createTaxPlanCycleRepository = vi.hoisted(() => vi.fn(() => repository));
const commentRepository = vi.hoisted(() => ({
  listByCase: vi.fn(async () => []),
  create: vi.fn(async () => null),
}));
const createTaxPlanCycleCommentRepository = vi.hoisted(() =>
  vi.fn(() => commentRepository),
);
const incomeEventRepository = vi.hoisted(() => ({
  listByCase: vi.fn(async ({ caseId }: { caseId: string }) => [
    {
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8ca218",
      case_id: caseId,
      date: "2026-08-31",
      source: "Synthetic W-2 wages",
      type: "w2" as const,
      amount: "125000.50",
      withholding: "21500.25",
    },
  ]),
  create: vi.fn(
    async (input: {
      caseId: string;
      date: string;
      source: string;
      type: "w2" | "1099" | "capital-gains" | "rental" | "other";
      amount: number;
      withholding: number;
    }) => ({
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8ca219",
      case_id: input.caseId,
      date: input.date,
      source: input.source,
      type: input.type,
      amount: input.amount.toFixed(2),
      withholding: input.withholding.toFixed(2),
    }),
  ),
}));
const createIncomeEventRepository = vi.hoisted(() =>
  vi.fn(() => incomeEventRepository),
);
const stageChangedPublisher = vi.hoisted(() => ({
  publishStageChanged: vi.fn(async () => undefined),
}));
const transitionControllerOptions = vi.hoisted(() => ({
  value: undefined as
    | {
        queueCacheInvalidator?: unknown;
        stageChangedEventPublisher?: unknown;
      }
    | undefined,
}));

vi.mock("pg", () => ({
  default: {
    Client: class {
      async connect(): Promise<void> {}
    },
  },
}));

vi.mock("redis", () => ({
  createClient: vi.fn(() => {
    const store = new Map<string, string>();

    return {
      async connect(): Promise<void> {},
      async quit(): Promise<void> {},
      async get(key: string): Promise<string | null> {
        return store.get(key) ?? null;
      },
      async set(
        key: string,
        value: string,
        options?: { NX?: boolean },
      ): Promise<"OK" | null> {
        if (options?.NX && store.has(key)) {
          return null;
        }

        store.set(key, value);
        return "OK";
      },
      async del(key: string): Promise<number> {
        store.delete(key);
        return 1;
      },
      async incr(key: string): Promise<number> {
        const nextValue = (Number.parseInt(store.get(key) ?? "0", 10) || 0) + 1;
        store.set(key, String(nextValue));
        return nextValue;
      },
    };
  }),
}));

vi.mock(
  "../../../../src/typescript/features/taxPlanCycle/repositories/repository.js",
  async (importOriginal) => {
    const actual =
      await importOriginal<typeof import("../../../../src/typescript/features/taxPlanCycle/repositories/repository.js")>();

    return {
      ...actual,
      createTaxPlanCycleRepository,
    };
  },
);

vi.mock("../../../../src/typescript/features/incomeEvents/index.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../../src/typescript/features/incomeEvents/index.js")>();

  return {
    ...actual,
    createIncomeEventRepository,
  };
});

vi.mock("../../../../src/typescript/features/taxPlanCycle/index.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../../src/typescript/features/taxPlanCycle/index.js")>();

  return {
    ...actual,
    createStageChangedSnsClient: vi.fn(() => ({
      send: vi.fn(),
    })),
    createSnsStageChangedEventPublisher: vi.fn(() => stageChangedPublisher),
    createTaxPlanCycleCommentRepository,
    createTaxpayerIdentifierValidationRepository: vi.fn(() => ({
      record: vi.fn(),
      findByCaseId: vi.fn(async () => null),
    })),
    createTaxPlanCycleTransitionController: vi.fn((repository, options) => {
      transitionControllerOptions.value = options;

      return {
        transition: vi.fn(async () => null),
        findByCaseId: vi.fn(async () => null),
      };
    }),
  };
});

const originalEnvironment = { ...process.env };
const jwtFixturePromise = createTestJwtFixture("https://auth.taxpulse.example");
const assistStartupEnvironment = {
  OPENAI_API_KEY: "test-openai-api-key",
  ASSIST_TENANT_CORPUS_SCOPE_MAP:
    '{"018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01":"tenant-alpha","018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02":"tenant-beta"}',
} as const;

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.clearAllMocks();
});

async function createAccessToken(): Promise<string> {
  return await signTestAccessToken(await jwtFixturePromise);
}

describe("main Tax Plan Cycle composition", () => {
  test("uses the repository-backed controller for protected creates and reads", async () => {
    const jwtFixture = await jwtFixturePromise;
    repository.listQueue.mockResolvedValue([
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
        client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
        client_name: "Test Client",
        stage: "Modeling",
        owner: "postman-test-owner",
        priority: "high",
        due_date: "2026-12-31",
        on_hold: false,
        is_overdue: false,
        updated_at: "2026-07-27T00:00:00.000Z",
      },
    ]);

    await withJwksServer(jwtFixture.jwks, async (jwksUrl) => {
      process.env = {
        ...originalEnvironment,
        DATABASE_URL: "postgresql://test:test@localhost:5432/taxpulse",
        JWT_ISSUER: jwtFixture.issuer,
        JWT_JWKS_URL: jwksUrl,
        JWT_SIGNING_PRIVATE_KEY: jwtFixture.privateKeyPem,
        JWT_SIGNING_KEY_ID: jwtFixture.signingKeyId,
        JWT_ACCESS_TOKEN_TTL_SECONDS: "900",
        JWT_REFRESH_TOKEN_TTL_SECONDS: "1200",
        LIABILITY_ENGINE_BASE: "http://127.0.0.1:8000",
        TAXPULSE_REDIS_URL: "redis://localhost:6379",
        ...assistStartupEnvironment,
        TAXPULSE_STAGE_CHANGED_TOPIC_ARN:
          "arn:aws:sns:us-east-1:123456789012:taxpulse-stage-changed",
        LOG_LEVEL: "silent",
        PORT: "0",
      };
      const { main } = await import("../../../../src/typescript/index.js");
      const server = await main();
      const address = server.address() as AddressInfo;
      const token = await createAccessToken();

      try {
        const createResponse = await fetch(`http://127.0.0.1:${address.port}/v1/tax-plan-cycles`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
            "Idempotency-Key": "main-composition-key-001",
          },
          body: JSON.stringify({
            client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
            planning_period: "2026-Q4",
            owner: "postman-test-owner",
            priority: "high",
            due_date: "2026-12-31",
          }),
        });
        const readResponse = await fetch(
          `http://127.0.0.1:${address.port}/v1/tax-plan-cycles/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91`,
          { headers: { authorization: `Bearer ${token}` } },
        );
        const queueResponse = await fetch(
          `http://127.0.0.1:${address.port}/v1/tax-plan-cycles`,
          { headers: { authorization: `Bearer ${token}` } },
        );
        const incomeReadResponse = await fetch(
          `http://127.0.0.1:${address.port}/v1/cases/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91/income-events`,
          { headers: { authorization: `Bearer ${token}` } },
        );
        const incomeCreateResponse = await fetch(
          `http://127.0.0.1:${address.port}/v1/cases/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91/income-events`,
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${token}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              source: "Acme Consulting",
              type: "1099",
              amount: 900,
              withholding: 125.5,
            }),
          },
        );
        const unauthenticatedIncomeResponse = await fetch(
          `http://127.0.0.1:${address.port}/v1/cases/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91/income-events`,
        );
        const unversionedResponse = await fetch(
          `http://127.0.0.1:${address.port}/tax-plan-cycles`,
        );
        const unknownVersionResponse = await fetch(
          `http://127.0.0.1:${address.port}/v2/tax-plan-cycles`,
        );

        expect(createResponse.status).toBe(202);
        expect(readResponse.status).toBe(200);
        expect(queueResponse.status).toBe(200);
        expect(incomeReadResponse.status).toBe(200);
        expect(await incomeReadResponse.json()).toEqual([
          expect.objectContaining({
            case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
            source: "Synthetic W-2 wages",
            amount: "125000.50",
          }),
        ]);
        expect(incomeCreateResponse.status).toBe(201);
        expect(await incomeCreateResponse.json()).toMatchObject({
          case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
          source: "Acme Consulting",
          type: "1099",
          amount: "900.00",
          withholding: "125.50",
        });
        expect(unauthenticatedIncomeResponse.status).toBe(401);
        expect(await queueResponse.json()).toEqual([
          expect.objectContaining({ client_name: "Test Client" }),
        ]);
        expect(unversionedResponse.status).toBe(404);
        expect(unknownVersionResponse.status).toBe(404);
        expect(createTaxPlanCycleRepository).toHaveBeenCalledTimes(1);
        expect(createTaxPlanCycleCommentRepository).toHaveBeenCalledTimes(1);
        expect(createIncomeEventRepository).toHaveBeenCalledTimes(1);
        expect(repository.create).toHaveBeenCalledWith({
          tenantId: "tenant-from-jwt",
          planningPeriod: "2026-Q4",
          clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
          owner: "postman-test-owner",
          priority: "high",
          dueDate: "2026-12-31",
          actor: "user-from-jwt",
        });
        expect(repository.findByCaseId).toHaveBeenCalledWith({
          tenantId: "tenant-from-jwt",
          caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
        });
        expect(repository.listQueue).toHaveBeenCalledWith({
          tenantId: "tenant-from-jwt",
        });
        expect(incomeEventRepository.listByCase).toHaveBeenCalledWith({
          tenantId: "tenant-from-jwt",
          caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
        });
        expect(incomeEventRepository.create).toHaveBeenCalledWith({
          tenantId: "tenant-from-jwt",
          caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          source: "Acme Consulting",
          type: "1099",
          amount: 900,
          withholding: 125.5,
        });
      } finally {
        server.close();
        await once(server, "close");
      }
    });
  });

  test("wires the stage-changed publisher into the transition controller when configured", async () => {
    const jwtFixture = await jwtFixturePromise;

    await withJwksServer(jwtFixture.jwks, async (jwksUrl) => {
      process.env = {
        ...originalEnvironment,
        DATABASE_URL: "postgresql://test:test@localhost:5432/taxpulse",
        JWT_ISSUER: jwtFixture.issuer,
        JWT_JWKS_URL: jwksUrl,
        JWT_SIGNING_PRIVATE_KEY: jwtFixture.privateKeyPem,
        JWT_SIGNING_KEY_ID: jwtFixture.signingKeyId,
        JWT_ACCESS_TOKEN_TTL_SECONDS: "900",
        JWT_REFRESH_TOKEN_TTL_SECONDS: "1200",
        TAXPULSE_REDIS_URL: "redis://localhost:6379",
        ...assistStartupEnvironment,
        TAXPULSE_STAGE_CHANGED_TOPIC_ARN:
          "arn:aws:sns:us-east-1:123456789012:taxpulse-stage-changed",
        LOG_LEVEL: "silent",
        PORT: "0",
      };

      const { main } = await import("../../../../src/typescript/index.js");
      const server = await main();

      try {
        expect(transitionControllerOptions.value).toMatchObject({
          stageChangedEventPublisher: stageChangedPublisher,
        });
      } finally {
        server.close();
        await once(server, "close");
      }
    });
  });
});
