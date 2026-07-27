import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { createClient } from "redis";

import {
  buildTaxPlanCycleQueueReadCacheKey,
  createTaxPlanCycleQueueCache,
  type TaxPlanCycleQueueCacheClient,
  type TaxPlanCycleQueueCacheReadInput,
} from "./features/taxPlanCycle/index.js";
import {
  taxPlanCycleQueueProjectionItemSchema,
  type TaxPlanCycleQueueProjectionItem,
} from "./features/taxPlanCycle/index.js";

loadEnv();

export const REDIS_SMOKE_TENANT_ID = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e81";
export const REDIS_SMOKE_CASE_ID = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e82";
export const REDIS_SMOKE_CLIENT_ID = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e83";
export const REDIS_SMOKE_AS_OF_DATE = "2026-07-24";

export interface RedisSmokeResult {
  cacheKey: string;
  input: TaxPlanCycleQueueCacheReadInput;
  writtenItems: TaxPlanCycleQueueProjectionItem[];
  cachedItems: TaxPlanCycleQueueProjectionItem[];
}

export interface RedisSmokeConnectivityClient {
  connect(): Promise<unknown>;
  ping(): Promise<unknown>;
}

export interface RedisSmokeCommandLogger {
  log(message: string): void;
  error(message: string): void;
}

export function buildRedisUnavailableMessage(redisUrl: string): string {
  return `Redis is not available at ${redisUrl}. Start the Redis stack with \`npm run redis:up\` and try again.`;
}

export function buildRedisSmokeQueueItem(): TaxPlanCycleQueueProjectionItem {
  return taxPlanCycleQueueProjectionItemSchema.parse({
    tenant_id: REDIS_SMOKE_TENANT_ID,
    case_id: REDIS_SMOKE_CASE_ID,
    client: REDIS_SMOKE_CLIENT_ID,
    stage: "Review",
    owner: "redis-smoke-owner",
    priority: "medium",
    due_date: "2026-07-31",
    is_overdue: false,
  });
}

export function buildRedisSmokeQueuePayload(): TaxPlanCycleQueueProjectionItem[] {
  return [buildRedisSmokeQueueItem()];
}

export function buildRedisSmokeQueueInput(): TaxPlanCycleQueueCacheReadInput {
  return {
    tenantId: REDIS_SMOKE_TENANT_ID,
    asOfDate: REDIS_SMOKE_AS_OF_DATE,
  };
}

export function buildRedisSmokeCacheKey(version = 0): string {
  return buildTaxPlanCycleQueueReadCacheKey({
    ...buildRedisSmokeQueueInput(),
    version,
  });
}

export async function verifyRedisIsUp(
  client: RedisSmokeConnectivityClient,
  redisUrl: string,
): Promise<void> {
  try {
    await client.connect();
    await client.ping();
  } catch {
    throw new Error(buildRedisUnavailableMessage(redisUrl));
  }
}

export function formatRedisSmokePassMessage(redisUrl: string): string {
  return `PASS Redis smoke check passed against ${redisUrl}`;
}

export function formatRedisSmokeFailMessage(
  redisUrl: string,
  reason: string,
): string {
  return `FAIL Redis smoke check failed against ${redisUrl}: ${reason}`;
}

export async function runRedisSmokeCommand(
  client: TaxPlanCycleQueueCacheClient & RedisSmokeConnectivityClient,
  redisUrl: string,
  logger: RedisSmokeCommandLogger = console,
): Promise<void> {
  try {
    await verifyRedisIsUp(client, redisUrl);
    const result = await runRedisSmoke(client);

    logger.log(formatRedisSmokePassMessage(redisUrl));
    logger.log(`Cache key: ${result.cacheKey}`);
    logger.log(JSON.stringify(result.cachedItems, null, 2));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error(formatRedisSmokeFailMessage(redisUrl, reason));
    throw error;
  }
}

export async function runRedisSmoke(
  client: TaxPlanCycleQueueCacheClient,
): Promise<RedisSmokeResult> {
  const cache = createTaxPlanCycleQueueCache(client, { ttlSeconds: 300 });
  const input = buildRedisSmokeQueueInput();
  const writtenItems = buildRedisSmokeQueuePayload();

  await cache.writeQueue(input, writtenItems);

  const cachedItems = await cache.readQueue(input);

  if (cachedItems === null) {
    throw new Error("Redis smoke test could not read the cache back.");
  }

  return {
    cacheKey: buildRedisSmokeCacheKey(),
    input,
    writtenItems,
    cachedItems,
  };
}

export async function main(): Promise<void> {
  const redisUrl = process.env.TAXPULSE_REDIS_URL?.trim() ?? "redis://localhost:6379";
  const client = createClient({ url: redisUrl, socket: { connectTimeout: 3_000 } });

  try {
    await runRedisSmokeCommand(client, redisUrl);
  } finally {
    await client.quit().catch(() => undefined);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(() => {
    process.exitCode = 1;
  });
}
