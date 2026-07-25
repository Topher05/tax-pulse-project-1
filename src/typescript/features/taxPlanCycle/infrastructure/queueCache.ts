import {
  taxPlanCycleQueueProjectionItemsSchema,
  type TaxPlanCycleQueueProjectionItem,
} from "./queueProjection.js";

export interface TaxPlanCycleQueueCacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
  incr(key: string): Promise<number>;
}

export interface TaxPlanCycleQueueCacheReadInput {
  tenantId: string;
  asOfDate: string;
}

export interface TaxPlanCycleQueueCache {
  readQueue(
    input: TaxPlanCycleQueueCacheReadInput,
  ): Promise<TaxPlanCycleQueueProjectionItem[] | null>;
  writeQueue(
    input: TaxPlanCycleQueueCacheReadInput,
    items: TaxPlanCycleQueueProjectionItem[],
  ): Promise<void>;
  bumpTenantVersion(tenantId: string): Promise<number>;
}

export interface TaxPlanCycleQueueCacheInvalidator {
  invalidateAfterStageChange(input: {
    tenantId: string;
    caseId: string;
  }): Promise<void>;
  invalidateAfterDueDateChange(input: {
    tenantId: string;
    caseId: string;
  }): Promise<void>;
}

const queueCacheNamespace = "taxpulse:queue";
const defaultQueueCacheTtlSeconds = 900;

export function buildTaxPlanCycleQueueTenantVersionKey(
  tenantId: string,
): string {
  return `${queueCacheNamespace}:tenant:${tenantId}:version`;
}

export function buildTaxPlanCycleQueueReadCacheKey(
  input: TaxPlanCycleQueueCacheReadInput & { version: number },
): string {
  return `${queueCacheNamespace}:tenant:${input.tenantId}:v${input.version}:as-of:${input.asOfDate}`;
}

function toTaxPlanCycleQueueItems(value: string): TaxPlanCycleQueueProjectionItem[] {
  const parsed = JSON.parse(value) as unknown;

  return taxPlanCycleQueueProjectionItemsSchema.parse(parsed);
}

export function createTaxPlanCycleQueueCache(
  client: TaxPlanCycleQueueCacheClient,
  options: {
    ttlSeconds?: number;
  } = {},
): TaxPlanCycleQueueCache {
  const ttlSeconds = options.ttlSeconds ?? defaultQueueCacheTtlSeconds;

  async function getTenantVersion(tenantId: string): Promise<number> {
    const versionKey = buildTaxPlanCycleQueueTenantVersionKey(tenantId);
    const rawVersion = await client.get(versionKey);

    if (rawVersion === null) {
      return 0;
    }

    const parsedVersion = Number.parseInt(rawVersion, 10);

    if (!Number.isInteger(parsedVersion) || parsedVersion < 0) {
      throw new Error(
        `Queue cache version for tenant ${tenantId} must be a non-negative integer.`,
      );
    }

    return parsedVersion;
  }

  async function bumpTenantVersion(tenantId: string): Promise<number> {
    // The cache is versioned so invalidation only needs a single tenant-scoped bump.
    const versionKey = buildTaxPlanCycleQueueTenantVersionKey(tenantId);
    return await client.incr(versionKey);
  }

  async function readQueue(
    input: TaxPlanCycleQueueCacheReadInput,
  ): Promise<TaxPlanCycleQueueProjectionItem[] | null> {
    const version = await getTenantVersion(input.tenantId);
    const cacheKey = buildTaxPlanCycleQueueReadCacheKey({
      ...input,
      version,
    });
    const cachedValue = await client.get(cacheKey);

    if (cachedValue === null) {
      return null;
    }

    try {
      return toTaxPlanCycleQueueItems(cachedValue);
    } catch {
      return null;
    }
  }

  async function writeQueue(
    input: TaxPlanCycleQueueCacheReadInput,
    items: TaxPlanCycleQueueProjectionItem[],
  ): Promise<void> {
    const version = await getTenantVersion(input.tenantId);
    const cacheKey = buildTaxPlanCycleQueueReadCacheKey({
      ...input,
      version,
    });

    // Queue responses are disposable cache state, so give them a short TTL.
    await client.set(cacheKey, JSON.stringify(items), { EX: ttlSeconds });
  }

  return {
    readQueue,
    writeQueue,
    bumpTenantVersion,
  };
}

export function createTaxPlanCycleQueueCacheInvalidator(
  cache: Pick<TaxPlanCycleQueueCache, "bumpTenantVersion">,
): TaxPlanCycleQueueCacheInvalidator {
  async function invalidate(input: { tenantId: string; caseId: string }): Promise<void> {
    void input.caseId;
    await cache.bumpTenantVersion(input.tenantId);
  }

  return {
    invalidateAfterStageChange: invalidate,
    invalidateAfterDueDateChange: invalidate,
  };
}

export function createNoopTaxPlanCycleQueueCacheInvalidator(): TaxPlanCycleQueueCacheInvalidator {
  async function invalidate(input: { tenantId: string; caseId: string }): Promise<void> {
    void input.tenantId;
    void input.caseId;
  }

  return {
    invalidateAfterStageChange: invalidate,
    invalidateAfterDueDateChange: invalidate,
  };
}
