import { describe, expect, test, vi } from "vitest";

import {
  buildTaxPlanCycleQueueReadCacheKey,
  buildTaxPlanCycleQueueTenantVersionKey,
  createNoopTaxPlanCycleQueueCacheInvalidator,
  createTaxPlanCycleQueueCache,
  createTaxPlanCycleQueueCacheInvalidator,
} from "../../src/typescript/index.js";
import { createTaxPlanCycleQueueReadService } from "../../src/typescript/taxPlanCycleQueueReadService.js";
import type { TaxPlanCycleQueueCacheClient } from "../../src/typescript/taxPlanCycleQueueCache.js";
import type { TaxPlanCycleQueueProjectionItem } from "../../src/typescript/taxPlanCycleQueueProjection.js";

function createInMemoryRedisClient(
  seed: Record<string, string> = {},
): TaxPlanCycleQueueCacheClient & {
  store: Map<string, string>;
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  incr: ReturnType<typeof vi.fn>;
} {
  const store = new Map(Object.entries(seed));
  const get = vi.fn(async (key: string) => store.get(key) ?? null);
  const set = vi.fn(
    async (
      key: string,
      value: string,
      _options?: {
        EX?: number;
      },
    ) => {
      store.set(key, value);
      return "OK";
    },
  );
  const incr = vi.fn(async (key: string) => {
    const nextValue = (Number.parseInt(store.get(key) ?? "0", 10) || 0) + 1;
    store.set(key, String(nextValue));
    return nextValue;
  });

  return {
    store,
    get,
    set,
    incr,
  };
}

const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e51";
const caseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e52";
const asOfDate = "2026-07-15";

const staleQueueItem: TaxPlanCycleQueueProjectionItem = {
  tenant_id: tenantId,
  case_id: caseId,
  client: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e53",
  stage: "Intake",
  owner: "advisor-cache-001",
  priority: "low",
  due_date: "2026-07-10",
  is_overdue: true,
};

const freshQueueItem: TaxPlanCycleQueueProjectionItem = {
  ...staleQueueItem,
  stage: "Review",
  due_date: "2026-08-10",
  is_overdue: false,
};

describe("tax plan cycle queue cache", () => {
  test("builds versioned tenant cache keys", () => {
    expect(buildTaxPlanCycleQueueTenantVersionKey(tenantId)).toBe(
      `taxpulse:queue:tenant:${tenantId}:version`,
    );
    expect(
      buildTaxPlanCycleQueueReadCacheKey({
        tenantId,
        asOfDate,
        version: 3,
      }),
    ).toBe(
      `taxpulse:queue:tenant:${tenantId}:v3:as-of:${asOfDate}`,
    );
  });

  test("populates cache on a miss and serves the cached payload on the next read", async () => {
    const redisClient = createInMemoryRedisClient();
    const cache = createTaxPlanCycleQueueCache(redisClient, { ttlSeconds: 600 });
    const projectionReader = {
      listQueue: vi.fn(async () => [freshQueueItem]),
    };
    const service = createTaxPlanCycleQueueReadService({
      cache,
      projectionReader,
    });

    const firstRead = await service.listQueue({
      tenantId,
      asOfDate,
    });
    const secondRead = await service.listQueue({
      tenantId,
      asOfDate,
    });

    expect(firstRead).toEqual([freshQueueItem]);
    expect(secondRead).toEqual([freshQueueItem]);
    expect(projectionReader.listQueue).toHaveBeenCalledTimes(1);
    expect(redisClient.set).toHaveBeenCalledWith(
      buildTaxPlanCycleQueueReadCacheKey({
        tenantId,
        asOfDate,
        version: 0,
      }),
      JSON.stringify([freshQueueItem]),
      { EX: 600 },
    );
  });

  test("bumps the tenant cache version for stage and due-date invalidations", async () => {
    const redisClient = createInMemoryRedisClient();
    const cache = createTaxPlanCycleQueueCache(redisClient);
    const invalidator = createTaxPlanCycleQueueCacheInvalidator(cache);

    await invalidator.invalidateAfterStageChange({
      tenantId,
      caseId,
    });
    await invalidator.invalidateAfterDueDateChange({
      tenantId,
      caseId,
    });

    expect(redisClient.incr).toHaveBeenCalledTimes(2);
    expect(redisClient.incr).toHaveBeenNthCalledWith(
      1,
      buildTaxPlanCycleQueueTenantVersionKey(tenantId),
    );
    expect(redisClient.incr).toHaveBeenNthCalledWith(
      2,
      buildTaxPlanCycleQueueTenantVersionKey(tenantId),
    );
    expect(redisClient.store.get(buildTaxPlanCycleQueueTenantVersionKey(tenantId))).toBe(
      "2",
    );
  });

  test("does not serve a stale cached queue after a stage transition invalidation", async () => {
    const seed = {
      [buildTaxPlanCycleQueueReadCacheKey({
        tenantId,
        asOfDate,
        version: 0,
      })]: JSON.stringify([staleQueueItem]),
    };
    const redisClient = createInMemoryRedisClient(seed);
    const cache = createTaxPlanCycleQueueCache(redisClient);
    const invalidator = createTaxPlanCycleQueueCacheInvalidator(cache);
    const projectionReader = {
      listQueue: vi.fn(async () => [freshQueueItem]),
    };
    const service = createTaxPlanCycleQueueReadService({
      cache,
      projectionReader,
    });

    await invalidator.invalidateAfterStageChange({
      tenantId,
      caseId,
    });

    const queue = await service.listQueue({
      tenantId,
      asOfDate,
    });

    expect(queue).toEqual([freshQueueItem]);
    expect(projectionReader.listQueue).toHaveBeenCalledTimes(1);
    expect(redisClient.store.get(
      buildTaxPlanCycleQueueReadCacheKey({
        tenantId,
        asOfDate,
        version: 1,
      }),
    )).toBe(JSON.stringify([freshQueueItem]));
  });

  test("exposes a noop invalidator for environments without Redis", async () => {
    const invalidator = createNoopTaxPlanCycleQueueCacheInvalidator();

    await expect(
      invalidator.invalidateAfterStageChange({
        tenantId,
        caseId,
      }),
    ).resolves.toBeUndefined();
  });
});
