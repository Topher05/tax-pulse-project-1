import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { SignJWT } from "jose";
import { afterEach, describe, expect, test, vi } from "vitest";

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

vi.mock("../../../../src/typescript/features/taxPlanCycle/index.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../../src/typescript/features/taxPlanCycle/index.js")>();

  return {
    ...actual,
    createStageChangedSnsClient: vi.fn(() => ({
      send: vi.fn(),
    })),
    createSnsStageChangedEventPublisher: vi.fn(() => stageChangedPublisher),
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

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.clearAllMocks();
});

async function createAccessToken(): Promise<string> {
  return await new SignJWT({
    role: "Advisor",
    tenant_id: "tenant-from-jwt",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject("user-from-jwt")
    .setIssuer(process.env.JWT_ISSUER!)
    .setExpirationTime("15m")
    .sign(new TextEncoder().encode(process.env.JWT_SIGNING_SECRET!));
}

describe("main Tax Plan Cycle composition", () => {
  test("uses the repository-backed controller for protected creates and reads", async () => {
    process.env = {
      ...originalEnvironment,
      DATABASE_URL: "postgresql://test:test@localhost:5432/taxpulse",
      JWT_ISSUER: "https://auth.taxpulse.example",
      JWT_SIGNING_SECRET: "a-unique-test-secret-that-is-more-than-32-bytes",
      JWT_ACCESS_TOKEN_TTL_SECONDS: "900",
      JWT_REFRESH_TOKEN_TTL_SECONDS: "1200",
      LIABILITY_ENGINE_BASE: "http://127.0.0.1:8000",
      TAXPULSE_REDIS_URL: "redis://localhost:6379",
      TAXPULSE_STAGE_CHANGED_TOPIC_ARN:
        "arn:aws:sns:us-east-1:123456789012:taxpulse-stage-changed",
      LOG_LEVEL: "silent",
      PORT: "0",
    };
    const { main } = await import("../../../../src/typescript/index.js");
    const server = await main();
    const address = server.address() as AddressInfo;
    const token = await createAccessToken();
    repository.listQueue.mockResolvedValue([
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
        client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
        stage: "Modeling",
        owner: "postman-test-owner",
        priority: "high",
        due_date: "2026-12-31",
        on_hold: false,
        is_overdue: false,
        updated_at: "2026-07-27T00:00:00.000Z",
      },
    ]);

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
      const unversionedResponse = await fetch(
        `http://127.0.0.1:${address.port}/tax-plan-cycles`,
      );
      const unknownVersionResponse = await fetch(
        `http://127.0.0.1:${address.port}/v2/tax-plan-cycles`,
      );

      expect(createResponse.status).toBe(202);
      expect(readResponse.status).toBe(200);
      expect(queueResponse.status).toBe(200);
      expect(unversionedResponse.status).toBe(404);
      expect(unknownVersionResponse.status).toBe(404);
      expect(createTaxPlanCycleRepository).toHaveBeenCalledTimes(1);
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
    } finally {
      server.close();
      await once(server, "close");
    }
  });

  test("wires the stage-changed publisher into the transition controller when configured", async () => {
    process.env = {
      ...originalEnvironment,
      DATABASE_URL: "postgresql://test:test@localhost:5432/taxpulse",
      JWT_ISSUER: "https://auth.taxpulse.example",
      JWT_SIGNING_SECRET: "a-unique-test-secret-that-is-more-than-32-bytes",
      JWT_ACCESS_TOKEN_TTL_SECONDS: "900",
      JWT_REFRESH_TOKEN_TTL_SECONDS: "1200",
      TAXPULSE_REDIS_URL: "redis://localhost:6379",
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
