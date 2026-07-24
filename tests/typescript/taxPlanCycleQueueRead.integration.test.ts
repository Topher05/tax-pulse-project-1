import { createClient } from "redis";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { buildTaxPlanCycleQueueReadCacheKey, createTaxPlanCycleQueueCache } from "../../src/typescript/taxPlanCycleQueueCache.js";
import { createTaxPlanCycleQueueReadService } from "../../src/typescript/taxPlanCycleQueueReadService.js";
import type { TaxPlanCycleQueueProjectionItem } from "../../src/typescript/taxPlanCycleQueueProjection.js";
import { startDockerRedisContainer } from "./bootstrap/dockerRedis.js";

const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e61";
const asOfDate = "2026-07-15";
const projectionItem: TaxPlanCycleQueueProjectionItem = {
  tenant_id: tenantId,
  case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e62",
  client: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e63",
  stage: "Review",
  owner: "advisor-cache-redis",
  priority: "high",
  due_date: "2026-08-10",
  is_overdue: false,
};

describe("tax plan cycle queue cache integration", () => {
  let container: Awaited<ReturnType<typeof startDockerRedisContainer>> | null = null;
  let redisClient: ReturnType<typeof createClient> | null = null;

  beforeEach(async () => {
    container = await startDockerRedisContainer();
    redisClient = createClient({ url: container.connectionUri });
    await redisClient.connect();
  });

  afterEach(async () => {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
    }

    if (container) {
      await container.stop();
      container = null;
    }
  });

  test("misses once, stores the result in Redis, and serves the cached value on the second read", async () => {
    if (!redisClient) {
      throw new Error("Redis client was not initialized.");
    }

    const cache = createTaxPlanCycleQueueCache(redisClient);
    const projectionReader = {
      listQueue: async () => [projectionItem],
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

    expect(firstRead).toEqual([projectionItem]);
    expect(secondRead).toEqual([projectionItem]);
    expect(
      await redisClient.get(
        buildTaxPlanCycleQueueReadCacheKey({
          tenantId,
          asOfDate,
          version: 0,
        }),
      ),
    ).not.toBeNull();
  });
});
