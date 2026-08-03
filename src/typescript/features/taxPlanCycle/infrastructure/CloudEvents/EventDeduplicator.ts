import { z } from "zod";

import type {
  TaxPlanCycleQueueProjectionIdempotencyClient,
  TaxPlanCycleQueueProjectionIdempotencyInput,
  TaxPlanCycleQueueProjectionIdempotencyStore,
} from "./model.js";

export class TaxPlanCycleQueueProjectionIdempotencyInProgressError extends Error {
  constructor() {
    super("A queue projection event with the same id is still being processed.");
    this.name = "TaxPlanCycleQueueProjectionIdempotencyInProgressError";
  }
}

export class TaxPlanCycleQueueProjectionIdempotencyUnavailableError extends Error {
  constructor() {
    super("Redis idempotency storage is unavailable for the queue projection consumer.");
    this.name = "TaxPlanCycleQueueProjectionIdempotencyUnavailableError";
  }
}

const defaultIdempotencyTtlSeconds = 24 * 60 * 60;

const queueProjectionIdempotencyRecordSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("pending"),
  }),
  z.object({
    status: z.literal("completed"),
  }),
]);

function isClaimed(setResult: unknown): boolean {
  return setResult === "OK" || setResult === true;
}

function pendingValue(): string {
  return JSON.stringify({ status: "pending" });
}

function completedValue(): string {
  return JSON.stringify({ status: "completed" });
}

function parseIdempotencyRecord(value: string): "pending" | "completed" | null {
  const parsed = queueProjectionIdempotencyRecordSchema.safeParse(JSON.parse(value) as unknown);

  if (!parsed.success) {
    return null;
  }

  return parsed.data.status;
}

export function buildTaxPlanCycleQueueProjectionIdempotencyKey(input: {
  tenantId: string;
  consumerName: string;
  eventId: string;
}): string {
  return `idem:queue-projection:${input.tenantId}:${input.consumerName}:${input.eventId}`;
}

export function createRedisTaxPlanCycleQueueProjectionIdempotencyStore(
  client: TaxPlanCycleQueueProjectionIdempotencyClient,
  options: {
    ttlSeconds?: number;
  } = {},
): TaxPlanCycleQueueProjectionIdempotencyStore {
  const ttlSeconds = options.ttlSeconds ?? defaultIdempotencyTtlSeconds;

  async function readRecord(
    key: string,
  ): Promise<"pending" | "completed" | null> {
    const value = await client.get(key);

    if (value === null) {
      return null;
    }

    try {
      return parseIdempotencyRecord(value);
    } catch {
      return null;
    }
  }

  async function claim(
    input: TaxPlanCycleQueueProjectionIdempotencyInput,
  ): Promise<boolean> {
    const key = buildTaxPlanCycleQueueProjectionIdempotencyKey(input);

    try {
      const existingRecord = await readRecord(key);

      if (existingRecord === "completed") {
        return false;
      }

      if (existingRecord === "pending") {
        throw new TaxPlanCycleQueueProjectionIdempotencyInProgressError();
      }

      const claimResult = await client.set(key, pendingValue(), {
        EX: ttlSeconds,
        NX: true,
      });

      if (isClaimed(claimResult)) {
        return true;
      }

      const claimedRecord = await readRecord(key);

      if (claimedRecord === "completed") {
        return false;
      }

      if (claimedRecord === "pending") {
        throw new TaxPlanCycleQueueProjectionIdempotencyInProgressError();
      }

      throw new TaxPlanCycleQueueProjectionIdempotencyUnavailableError();
    } catch (error) {
      if (error instanceof TaxPlanCycleQueueProjectionIdempotencyInProgressError) {
        throw error;
      }

      throw new TaxPlanCycleQueueProjectionIdempotencyUnavailableError();
    }
  }

  async function complete(
    input: TaxPlanCycleQueueProjectionIdempotencyInput,
  ): Promise<void> {
    const key = buildTaxPlanCycleQueueProjectionIdempotencyKey(input);
    await client.set(key, completedValue(), { EX: ttlSeconds });
  }

  async function release(
    input: TaxPlanCycleQueueProjectionIdempotencyInput,
  ): Promise<void> {
    const key = buildTaxPlanCycleQueueProjectionIdempotencyKey(input);
    await client.del(key).catch(() => undefined);
  }

  return {
    claim,
    complete,
    release,
  };
}
