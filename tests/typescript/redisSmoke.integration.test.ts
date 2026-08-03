import { createClient } from "redis";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  buildRedisSmokeCacheKey,
  buildRedisSmokeQueuePayload,
  runRedisSmoke,
} from "../../src/typescript/shared/scripts/redisSmoke.js";
import { startDockerRedisContainer } from "./bootstrap/dockerRedis.js";

describe("redis smoke integration", () => {
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

  test("writes and reads the mocked queue payload through Redis", async () => {
    if (!redisClient) {
      throw new Error("Redis client was not initialized.");
    }

    const result = await runRedisSmoke(redisClient);

    expect(result.cacheKey).toBe(buildRedisSmokeCacheKey());
    expect(result.writtenItems).toEqual(buildRedisSmokeQueuePayload());
    expect(result.cachedItems).toEqual(buildRedisSmokeQueuePayload());
    expect(await redisClient.get(result.cacheKey)).not.toBeNull();
  });
});
