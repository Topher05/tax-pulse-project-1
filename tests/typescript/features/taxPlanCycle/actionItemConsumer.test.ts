import { describe, expect, test, vi } from "vitest";

import {
  ACTION_ITEM_CREATED_CONSUMER_NAME,
  ACTION_ITEM_CREATED_IDEMPOTENCY_NAMESPACE,
  buildIdempotencyKey,
  createActionItemCreatedCloudEvent,
  createRedisActionItemConsumer,
  actionItemCreatedCloudEventSchemaV1,
  type IdempotencyGuard,
} from "../../../../src/typescript/index.js";

function createInMemoryRedisClient(
  seed: Record<string, string> = {},
): IdempotencyGuard & {
  store: Map<string, string>;
  setCalls: Array<{
    key: string;
    value: string;
    options?: { EX?: number; NX?: boolean };
  }>;
} {
  const store = new Map(Object.entries(seed));
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

const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f21";
const caseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f22";
const eventId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f23";

const actionItemEvent = actionItemCreatedCloudEventSchemaV1.parse(
  createActionItemCreatedCloudEvent(
    {
      tenantId,
      caseId,
      description: "Send the client checklist",
      deadline: "2026-08-21",
      actor: "advisor-001",
    },
    {
      idFactory: () => eventId,
      now: () => new Date("2026-08-04T15:00:00.000Z"),
    },
  ),
);

const createdActionItem = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f24",
  case_id: caseId,
  description: "Send the client checklist",
  deadline: "2026-08-21",
  completed: false,
} as const;

describe("tax plan cycle action-item consumer", () => {
  test("processes an action-item event once and records the Redis marker", async () => {
    const redisClient = createInMemoryRedisClient();
    const repository = {
      insert: vi.fn(async () => createdActionItem),
    };
    const consumer = createRedisActionItemConsumer(redisClient, repository);

    const firstResult = await consumer.handleActionItemCreatedEvent(actionItemEvent);
    const secondResult = await consumer.handleActionItemCreatedEvent(actionItemEvent);
    const redisKey = buildIdempotencyKey({
      tenantId,
      consumerName: ACTION_ITEM_CREATED_CONSUMER_NAME,
      eventId,
      namespace: ACTION_ITEM_CREATED_IDEMPOTENCY_NAMESPACE,
    });

    expect(firstResult.status).toBe("processed");
    expect(firstResult.item).toEqual(createdActionItem);
    expect(secondResult.status).toBe("duplicate");
    expect(repository.insert).toHaveBeenCalledTimes(1);
    expect(repository.insert).toHaveBeenCalledWith({
      caseId,
      description: "Send the client checklist",
      deadline: "2026-08-21",
      completed: false,
    });
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
});
