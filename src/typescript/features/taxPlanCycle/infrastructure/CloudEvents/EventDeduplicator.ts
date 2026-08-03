import { z } from "zod";

import type {
  IdempotencyGuard,
  IdempotencyInput,
  IdempotencyStore,
} from "./model.js";

export class IdempotencyInProgressError extends Error {
  constructor() {
    super("A queue projection event with the same id is still being processed.");
    this.name = "IdempotencyInProgressError";
  }
}

export class IdempotencyUnavailableError extends Error {
  constructor() {
    super("Redis idempotency storage is unavailable for the queue projection consumer.");
    this.name = "IdempotencyUnavailableError";
  }
}

const defaultIdempotencyTtlSeconds = 24 * 60 * 60;

const deduplicationRecordSchema = z.discriminatedUnion("status", [
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

function parseDeduplicationRecord(value: string): "pending" | "completed" | null {
  const parsed = deduplicationRecordSchema.safeParse(JSON.parse(value) as unknown);

  if (!parsed.success) {
    return null;
  }

  return parsed.data.status;
}

export function buildIdempotencyKey(input: {
  tenantId: string;
  consumerName: string;
  eventId: string;
}): string {
  return `idem:queue-projection:${input.tenantId}:${input.consumerName}:${input.eventId}`;
}

export function createRedisIdempotencyStore(
  client: IdempotencyGuard,
  options: {
    ttlSeconds?: number;
  } = {},
): IdempotencyStore {
  const ttlSeconds = options.ttlSeconds ?? defaultIdempotencyTtlSeconds;

  async function readRecord(key: string): Promise<"pending" | "completed" | null> {
    const value = await client.get(key);

    if (value === null) {
      return null;
    }

    try {
      return parseDeduplicationRecord(value);
    } catch {
      return null;
    }
  }

  async function claim(input: IdempotencyInput): Promise<boolean> {
    const key = buildIdempotencyKey(input);

    try {
      const existingRecord = await readRecord(key);

      if (existingRecord === "completed") {
        return false;
      }

      if (existingRecord === "pending") {
        throw new IdempotencyInProgressError();
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
        throw new IdempotencyInProgressError();
      }

      throw new IdempotencyUnavailableError();
    } catch (error) {
      if (error instanceof IdempotencyInProgressError) {
        throw error;
      }

      throw new IdempotencyUnavailableError();
    }
  }

  async function complete(input: IdempotencyInput): Promise<void> {
    const key = buildIdempotencyKey(input);
    await client.set(key, completedValue(), { EX: ttlSeconds });
  }

  async function release(input: IdempotencyInput): Promise<void> {
    const key = buildIdempotencyKey(input);
    await client.del(key).catch(() => undefined);
  }

  return {
    claim,
    complete,
    release,
  };
}
