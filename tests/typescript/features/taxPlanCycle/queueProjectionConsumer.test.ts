import { describe, expect, test, vi } from "vitest";

import {
  STAGE_CHANGED_CONSUMER_NAME,
  createRedisConsumer,
  createStageChangedCloudEvent,
  stageChangedCloudEventSchemaV1,
  buildIdempotencyKey,
  type IdempotencyGuard,
  type TaxPlanCycle,
} from "../../../../src/typescript/index.js";

function createInMemoryRedisClient(
  seed: Record<string, string> = {},
): IdempotencyGuard & {
  store: Map<string, string>;
  getCalls: string[];
  setCalls: Array<{
    key: string;
    value: string;
    options?: { EX?: number; NX?: boolean };
  }>;
} {
  const store = new Map(Object.entries(seed));
  const getCalls: string[] = [];
  const setCalls: Array<{
    key: string;
    value: string;
    options?: { EX?: number; NX?: boolean };
  }> = [];

  return {
    store,
    getCalls,
    setCalls,
    async get(key) {
      getCalls.push(key);
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

const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e61";
const caseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e62";
const clientId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e63";
const eventId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e64";

const stageChangedEvent = stageChangedCloudEventSchemaV1.parse(
  createStageChangedCloudEvent(
    {
      tenantId,
      caseId,
      fromStage: "Modeling",
      toStage: "Review",
      actor: "advisor-001",
    },
    {
      idFactory: () => eventId,
      now: () => new Date("2026-07-22T12:00:00.000Z"),
    },
  ),
);

const expectedQueueItem = {
  tenant_id: tenantId,
  case_id: caseId,
  client: clientId,
  stage: "Review",
  owner: "Advisor One",
  priority: "high",
  due_date: "2026-07-21",
  is_overdue: true,
};

const repositoryCycle: TaxPlanCycle = {
  id: caseId,
  client_id: clientId,
  stage: "Review",
  owner: "Advisor One",
  priority: "high",
  due_date: "2026-07-21",
  on_hold: false,
};

describe("tax plan cycle queue projection consumer", () => {
  test("processes a stage-changed event once and records the Redis marker", async () => {
    const redisClient = createInMemoryRedisClient();
    const repository = {
      findByCaseId: vi.fn(async () => repositoryCycle),
    };
    const writer = {
      upsert: vi.fn(async () => undefined),
    };
    const consumer = createRedisConsumer(redisClient, repository, writer);

    const firstResult = await consumer.handleStageChangedEvent(stageChangedEvent);
    const secondResult = await consumer.handleStageChangedEvent(stageChangedEvent);
    const redisKey = buildIdempotencyKey({
      tenantId,
      consumerName: STAGE_CHANGED_CONSUMER_NAME,
      eventId: stageChangedEvent.id,
    });

    expect(firstResult.status).toBe("processed");
    expect(firstResult.item).toEqual(expectedQueueItem);
    expect(secondResult.status).toBe("duplicate");
    expect(repository.findByCaseId).toHaveBeenCalledTimes(1);
    expect(writer.upsert).toHaveBeenCalledTimes(1);
    expect(writer.upsert).toHaveBeenCalledWith(expectedQueueItem);
    expect(redisClient.setCalls).toEqual([
      {
        key: redisKey,
        value: JSON.stringify({ status: "pending" }),
        options: { EX: 86_400, NX: true },
      },
      {
        key: redisKey,
        value: JSON.stringify({ status: "completed" }),
        options: { EX: 86_400 },
      },
    ]);
    expect(redisClient.store.get(redisKey)).toBe(
      JSON.stringify({ status: "completed" }),
    );
  });

  test("fails closed when Redis cannot be read for idempotency", async () => {
    const repository = {
      findByCaseId: vi.fn(async () => repositoryCycle),
    };
    const writer = {
      upsert: vi.fn(async () => undefined),
    };
    const redisClient: IdempotencyGuard = {
      async get(): Promise<string | null> {
        throw new Error("redis unavailable");
      },
      async set(): Promise<"OK"> {
        throw new Error("redis unavailable");
      },
      async del(): Promise<number> {
        return 1;
      },
    };
    const consumer = createRedisConsumer(redisClient, repository, writer);

    await expect(
      consumer.handleStageChangedEvent(stageChangedEvent),
    ).rejects.toThrow("Redis idempotency storage is unavailable");
    expect(repository.findByCaseId).not.toHaveBeenCalled();
    expect(writer.upsert).not.toHaveBeenCalled();
  });
});
