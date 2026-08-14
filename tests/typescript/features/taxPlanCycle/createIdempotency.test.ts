import { describe, expect, test, vi } from "vitest";

import {
  buildTaxPlanCycleCreateIdempotencyKey,
  createRedisTaxPlanCycleCreateIdempotencyStore,
  createTaxPlanCycleCreateController,
  type TaxpayerIdentifierValidationRepository,
  type TaxpayerIdentifierValidator,
  type TaxPlanCycleCreateIdempotencyClient,
  type TaxPlanCycleRepository,
} from "../../../../src/typescript/index.js";

function createInMemoryCreateIdempotencyClient(): TaxPlanCycleCreateIdempotencyClient & {
  store: Map<string, string>;
  setCalls: Array<{
    key: string;
    value: string;
    options?: { EX?: number; NX?: boolean };
  }>;
} {
  const store = new Map<string, string>();
  const setCalls: Array<{
    key: string;
    value: string;
    options?: { EX?: number; NX?: boolean };
  }> = [];

  return {
    store,
    setCalls,
    async get(key) {
      return store.get(key) ?? null;
    },
    async set(key, value, options) {
      setCalls.push({ key, value, options });

      if (options?.NX && store.has(key)) {
        return null;
      }

      store.set(key, value);
      return "OK";
    },
    async del(key) {
      store.delete(key);
      return 1;
    },
  };
}

const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e51";
const otherTenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e52";
const idempotencyKey = "case-create-key-redis-001";
const caseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e53";
const otherCaseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e54";

describe("Tax Plan Cycle create idempotency in Redis", () => {
  test("builds a tenant-scoped Redis key", () => {
    expect(
      buildTaxPlanCycleCreateIdempotencyKey({
        tenantId,
        idempotencyKey,
      }),
    ).toBe(`idem:${tenantId}:${idempotencyKey}`);
  });

  test("stores the first result for 24 hours and replays it", async () => {
    const client = createInMemoryCreateIdempotencyClient();
    const store = createRedisTaxPlanCycleCreateIdempotencyStore(client);
    const createResult = vi.fn(async () => ({ case_id: caseId }));

    const firstResult = await store.run({ tenantId, idempotencyKey }, createResult);
    const repeatResult = await store.run({ tenantId, idempotencyKey }, createResult);
    const redisKey = buildTaxPlanCycleCreateIdempotencyKey({
      tenantId,
      idempotencyKey,
    });

    expect(firstResult).toEqual({ case_id: caseId });
    expect(repeatResult).toEqual(firstResult);
    expect(createResult).toHaveBeenCalledTimes(1);
    expect(client.store.get(redisKey)).toBe(
      JSON.stringify({
        status: "completed",
        result: firstResult,
      }),
    );
    expect(client.setCalls).toContainEqual(
      expect.objectContaining({
        key: redisKey,
        options: { EX: 86_400 },
      }),
    );
  });

  test("allows the same Idempotency-Key value in different tenant scopes", async () => {
    const client = createInMemoryCreateIdempotencyClient();
    const store = createRedisTaxPlanCycleCreateIdempotencyStore(client);

    const firstResult = await store.run(
      { tenantId, idempotencyKey },
      async () => ({ case_id: caseId }),
    );
    const otherTenantResult = await store.run(
      { tenantId: otherTenantId, idempotencyKey },
      async () => ({ case_id: otherCaseId }),
    );

    expect(firstResult.case_id).toBe(caseId);
    expect(otherTenantResult.case_id).toBe(otherCaseId);
    expect(
      client.store.has(
        buildTaxPlanCycleCreateIdempotencyKey({ tenantId, idempotencyKey }),
      ),
    ).toBe(true);
    expect(
      client.store.has(
        buildTaxPlanCycleCreateIdempotencyKey({
          tenantId: otherTenantId,
          idempotencyKey,
        }),
      ),
    ).toBe(true);
  });

  test("waits for an in-flight same-key create and returns the first result", async () => {
    const client = createInMemoryCreateIdempotencyClient();
    const store = createRedisTaxPlanCycleCreateIdempotencyStore(client, {
      pollIntervalMs: 1,
      waitTimeoutMs: 1_000,
    });
    const createResult = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { case_id: caseId };
    });

    const [firstResult, secondResult] = await Promise.all([
      store.run({ tenantId, idempotencyKey }, createResult),
      store.run({ tenantId, idempotencyKey }, createResult),
    ]);

    expect(secondResult).toEqual(firstResult);
    expect(createResult).toHaveBeenCalledTimes(1);
  });

  test("create controller fails closed when no idempotency store is configured", async () => {
    const repository: TaxPlanCycleRepository = {
      create: vi.fn(async () => caseId),
      insert: vi.fn(),
      findByCaseId: vi.fn(async () => null),
      findCurrentByClientId: vi.fn(async () => null),
      transition: vi.fn(async () => null),
      listQueue: vi.fn(async () => []),
    };
    const controller = createTaxPlanCycleCreateController(repository);

    await expect(
      controller.create({
        tenantId,
        actor: "advisor-001",
        idempotencyKey,
        client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
        planning_period: "2026-Q4",
        owner: "advisor-001",
        priority: "high",
        due_date: "2026-12-31",
      }),
    ).rejects.toMatchObject({
      status: 503,
      type: "https://taxpulse.example/problems/idempotency-store-unavailable",
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  test("records a clean taxpayer identifier validation result during Intake create", async () => {
    const repository: TaxPlanCycleRepository = {
      create: vi.fn(async () => caseId),
      insert: vi.fn(),
      findByCaseId: vi.fn(async () => null),
      transition: vi.fn(async () => null),
      listQueue: vi.fn(async () => []),
    };
    const taxpayerIdentifierValidator: TaxpayerIdentifierValidator = {
      validateTaxpayerIdentifier: vi.fn(async () => ({
        tinType: "ein",
        result: "match",
        verifiedName: "ACME GOVERNMENT SERVICES LLC",
        provider: "tivs",
      } as const)),
    };
    const taxpayerIdentifierValidationRepository: TaxpayerIdentifierValidationRepository = {
      record: vi.fn(async () => ({
        case_id: caseId,
        tin_type: "ein",
        validation_result: "match",
        verified_name: "ACME GOVERNMENT SERVICES LLC",
        provider: "tivs",
        validated_at: "2026-07-21T14:00:00.000Z",
      } as const)),
      findByCaseId: vi.fn(async () => null),
    };
    const controller = createTaxPlanCycleCreateController(repository, {
      idempotencyStore: createRedisTaxPlanCycleCreateIdempotencyStore(
        createInMemoryCreateIdempotencyClient(),
      ),
      taxpayerIdentifierValidator,
      taxpayerIdentifierValidationRepository,
    });

    await expect(
      controller.create({
        tenantId,
        actor: "advisor-001",
        idempotencyKey,
        client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
        planning_period: "2026-Q4",
        owner: "advisor-001",
        priority: "high",
        due_date: "2026-12-31",
        taxpayer_identifier: {
          tin: "12-3456789",
          tin_type: "EIN",
          legal_name: "ACME GOVERNMENT SERVICES LLC",
        },
      }),
    ).resolves.toEqual({ case_id: caseId });

    expect(taxpayerIdentifierValidator.validateTaxpayerIdentifier).toHaveBeenCalledWith({
      tin: "12-3456789",
      tin_type: "EIN",
      legal_name: "ACME GOVERNMENT SERVICES LLC",
    });
    expect(repository.create).toHaveBeenCalledWith({
      tenantId,
      actor: "advisor-001",
      planningPeriod: "2026-Q4",
      clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
      owner: "advisor-001",
      priority: "high",
      dueDate: "2026-12-31",
      taxpayerIdentifierValidation: {
        tinType: "ein",
        validationResult: "match",
        verifiedName: "ACME GOVERNMENT SERVICES LLC",
        provider: "tivs",
      },
    });
  });

  test("rejects taxpayer identifier input when Intake validation is not configured", async () => {
    const repository: TaxPlanCycleRepository = {
      create: vi.fn(async () => caseId),
      insert: vi.fn(),
      findByCaseId: vi.fn(async () => null),
      transition: vi.fn(async () => null),
      listQueue: vi.fn(async () => []),
    };
    const controller = createTaxPlanCycleCreateController(repository, {
      idempotencyStore: createRedisTaxPlanCycleCreateIdempotencyStore(
        createInMemoryCreateIdempotencyClient(),
      ),
    });

    await expect(
      controller.create({
        tenantId,
        actor: "advisor-001",
        idempotencyKey,
        client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
        planning_period: "2026-Q4",
        owner: "advisor-001",
        priority: "high",
        due_date: "2026-12-31",
        taxpayer_identifier: {
          tin: "12-3456789",
          tin_type: "EIN",
          legal_name: "ACME GOVERNMENT SERVICES LLC",
        },
      }),
    ).rejects.toMatchObject({
      status: 503,
      type: "https://taxpulse.example/problems/taxpayer-identifier-validation-unavailable",
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  test("does not create a case in the repository if taxpayer identifier validation fails", async () => {
    const repository: TaxPlanCycleRepository = {
      create: vi.fn(async () => caseId),
      insert: vi.fn(),
      findByCaseId: vi.fn(async () => null),
      transition: vi.fn(async () => null),
      listQueue: vi.fn(async () => []),
    };
    const taxpayerIdentifierValidator: TaxpayerIdentifierValidator = {
      validateTaxpayerIdentifier: vi.fn(async () => {
        throw new Error("SOAP endpoint unreachable");
      }),
    };
    const taxpayerIdentifierValidationRepository: TaxpayerIdentifierValidationRepository = {
      record: vi.fn(),
      findByCaseId: vi.fn(async () => null),
    };
    const controller = createTaxPlanCycleCreateController(repository, {
      idempotencyStore: createRedisTaxPlanCycleCreateIdempotencyStore(
        createInMemoryCreateIdempotencyClient(),
      ),
      taxpayerIdentifierValidator,
      taxpayerIdentifierValidationRepository,
    });

    await expect(
      controller.create({
        tenantId,
        actor: "advisor-001",
        idempotencyKey,
        client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
        planning_period: "2026-Q4",
        owner: "advisor-001",
        priority: "high",
        due_date: "2026-12-31",
        taxpayer_identifier: {
          tin: "12-3456789",
          tin_type: "EIN",
          legal_name: "ACME GOVERNMENT SERVICES LLC",
        },
      }),
    ).rejects.toThrow("SOAP endpoint unreachable");

    expect(repository.create).not.toHaveBeenCalled();
  });
});
