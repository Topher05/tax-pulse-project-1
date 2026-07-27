import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const composeText = readFileSync(
  new URL("../../docker-compose.redis.yml", import.meta.url),
  "utf8",
);

describe("redis docker compose wiring", () => {
  test("defines Redis and RedisInsight services with the expected ports and preconfiguration", () => {
    expect(composeText).toContain("taxpulse-redis:");
    expect(composeText).toContain("taxpulse-redisinsight:");
    expect(composeText).toContain('"6379:6379"');
    expect(composeText).toContain('"5540:5540"');
    expect(composeText).toContain("RI_ACCEPT_TERMS_AND_CONDITIONS: \"true\"");
    expect(composeText).toContain("RI_REDIS_HOST0: taxpulse-redis");
    expect(composeText).toContain("RI_REDIS_PORT0: \"6379\"");
    expect(composeText).toContain("RI_APP_PORT: \"5540\"");
  });
});
