import { describe, expect, test, vi } from "vitest";

import {
  REDIS_SMOKE_AS_OF_DATE,
  REDIS_SMOKE_CASE_ID,
  REDIS_SMOKE_CLIENT_ID,
  REDIS_SMOKE_TENANT_ID,
  buildRedisUnavailableMessage,
  formatRedisSmokeFailMessage,
  formatRedisSmokePassMessage,
  buildRedisSmokeCacheKey,
  buildRedisSmokeQueueInput,
  buildRedisSmokeQueueItem,
  buildRedisSmokeQueuePayload,
  runRedisSmokeCommand,
  verifyRedisIsUp,
} from "../../src/typescript/redisSmoke.js";
import { buildTaxPlanCycleQueueReadCacheKey } from "../../src/typescript/features/taxPlanCycle/infrastructure/queueCache.js";

describe("redis smoke helpers", () => {
  function createInMemoryRedisClient(
    seed: Record<string, string> = {},
  ): {
    store: Map<string, string>;
    connect: ReturnType<typeof vi.fn>;
    ping: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    incr: ReturnType<typeof vi.fn>;
  } {
    const store = new Map(Object.entries(seed));
    const connect = vi.fn(async () => undefined);
    const ping = vi.fn(async () => "PONG");
    const get = vi.fn(async (key: string) => store.get(key) ?? null);
    const set = vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return "OK";
    });
    const incr = vi.fn(async (key: string) => {
      const nextValue = (Number.parseInt(store.get(key) ?? "0", 10) || 0) + 1;
      store.set(key, String(nextValue));
      return nextValue;
    });

    return {
      store,
      connect,
      ping,
      get,
      set,
      incr,
    };
  }

  test("builds the mocked queue payload in the projected shape", () => {
    const item = buildRedisSmokeQueueItem();

    expect(item).toEqual({
      tenant_id: REDIS_SMOKE_TENANT_ID,
      case_id: REDIS_SMOKE_CASE_ID,
      client: REDIS_SMOKE_CLIENT_ID,
      stage: "Review",
      owner: "redis-smoke-owner",
      priority: "medium",
      due_date: "2026-07-31",
      is_overdue: false,
    });
    expect(buildRedisSmokeQueuePayload()).toEqual([item]);
  });

  test("builds the tenant-scoped cache key for the smoke payload", () => {
    const input = buildRedisSmokeQueueInput();

    expect(input).toEqual({
      tenantId: REDIS_SMOKE_TENANT_ID,
      asOfDate: REDIS_SMOKE_AS_OF_DATE,
    });
    expect(buildRedisSmokeCacheKey()).toBe(
      buildTaxPlanCycleQueueReadCacheKey({
        ...input,
        version: 0,
      }),
    );
  });

  test("fails fast with a clear message when Redis is not reachable", async () => {
    await expect(
      verifyRedisIsUp(
        {
          connect: async () => {
            throw new Error("connection failed");
          },
          ping: async () => "PONG",
        },
        "redis://localhost:6379",
      ),
    ).rejects.toThrow(
      buildRedisUnavailableMessage("redis://localhost:6379"),
    );
  });

  test("formats clear pass and fail messages", () => {
    expect(formatRedisSmokePassMessage("redis://localhost:6379")).toBe(
      "PASS Redis smoke check passed against redis://localhost:6379",
    );
    expect(
      formatRedisSmokeFailMessage(
        "redis://localhost:6379",
        "connection failed",
      ),
    ).toBe(
      "FAIL Redis smoke check failed against redis://localhost:6379: connection failed",
    );
  });

  test("prints PASS when the smoke command succeeds", async () => {
    const logger = {
      log: vi.fn(),
      error: vi.fn(),
    };
    const client = createInMemoryRedisClient();

    await runRedisSmokeCommand(client, "redis://localhost:6379", logger);

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      "PASS Redis smoke check passed against redis://localhost:6379",
    );
  });

  test("prints FAIL when the smoke command cannot reach Redis", async () => {
    const logger = {
      log: vi.fn(),
      error: vi.fn(),
    };
    const client = {
      connect: vi.fn(async () => {
        throw new Error("connection failed");
      }),
      ping: vi.fn(async () => "PONG"),
      get: vi.fn(async () => null),
      set: vi.fn(async () => "OK"),
      incr: vi.fn(async () => 1),
    };

    await expect(
      runRedisSmokeCommand(client, "redis://localhost:6379", logger),
    ).rejects.toThrow(
      buildRedisUnavailableMessage("redis://localhost:6379"),
    );

    expect(logger.log).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      "FAIL Redis smoke check failed against redis://localhost:6379: Redis is not available at redis://localhost:6379. Start the Redis stack with `npm run redis:up` and try again.",
    );
  });
});
