import { z } from "zod";

import { taxPlanCycleQueueProjectionItemSchema, type TaxPlanCycleQueueProjectionItem } from "./taxPlanCycleQueueProjection.js";
import type { TaxPlanCycleQueueCache, TaxPlanCycleQueueCacheReadInput } from "./taxPlanCycleQueueCache.js";
import type { TaxPlanCycleQueueInput } from "./taxPlanCycleRepository.js";
import type { TaxPlanCycleQueueProjectionReader } from "./taxPlanCycleQueueDynamoStore.js";

export interface TaxPlanCycleQueueReadService {
  listQueue(
    input: TaxPlanCycleQueueInput,
  ): Promise<TaxPlanCycleQueueProjectionItem[]>;
}

export interface TaxPlanCycleQueueReadServiceOptions {
  cache: TaxPlanCycleQueueCache;
  projectionReader: TaxPlanCycleQueueProjectionReader;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const queueProjectionItemsSchema = z.array(taxPlanCycleQueueProjectionItemSchema);

export function createTaxPlanCycleQueueReadService(
  options: TaxPlanCycleQueueReadServiceOptions,
): TaxPlanCycleQueueReadService {
  async function readFromCache(
    input: TaxPlanCycleQueueCacheReadInput,
  ): Promise<TaxPlanCycleQueueProjectionItem[] | null> {
    const cachedQueue = await options.cache.readQueue(input);

    if (cachedQueue === null) {
      return null;
    }

    return queueProjectionItemsSchema.parse(cachedQueue);
  }

  return {
    async listQueue({ tenantId, asOfDate = todayIsoDate() }) {
      const cacheInput = { tenantId, asOfDate };
      const cachedQueue = await readFromCache(cacheInput);

      if (cachedQueue !== null) {
        return cachedQueue;
      }

      const queue = await options.projectionReader.listQueue({
        tenantId,
        asOfDate,
      });
      await options.cache.writeQueue(cacheInput, queue);

      return queue;
    },
  };
}
