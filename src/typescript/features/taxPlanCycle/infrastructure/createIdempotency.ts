import { setTimeout as delay } from "node:timers/promises";

import { z } from "zod";

import type { TaxPlanCycleCreateResult } from "../controllers/createController.js";

export interface TaxPlanCycleCreateIdempotencyClient {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { EX?: number; NX?: boolean },
  ): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export interface TaxPlanCycleCreateIdempotencyInput {
  tenantId: string;
  idempotencyKey: string;
}

export interface TaxPlanCycleCreateIdempotencyStore {
  run(
    input: TaxPlanCycleCreateIdempotencyInput,
    createResult: () => Promise<TaxPlanCycleCreateResult>,
  ): Promise<TaxPlanCycleCreateResult>;
}

export class TaxPlanCycleCreateIdempotencyInProgressError extends Error {
  constructor() {
    super("A create request with the same Idempotency-Key is still in progress.");
    this.name = "TaxPlanCycleCreateIdempotencyInProgressError";
  }
}

export class TaxPlanCycleCreateIdempotencyUnavailableError extends Error {
  constructor() {
    super("Redis idempotency storage is unavailable for Tax Plan Cycle creation.");
    this.name = "TaxPlanCycleCreateIdempotencyUnavailableError";
  }
}

const taxPlanCycleCreateIdempotencyResultSchema = z.object({
  case_id: z.uuid(),
});
const completedIdempotencyRecordSchema = z.object({
  status: z.literal("completed"),
  result: taxPlanCycleCreateIdempotencyResultSchema,
});
const pendingIdempotencyRecordSchema = z.object({
  status: z.literal("pending"),
});
const idempotencyRecordSchema = z.discriminatedUnion("status", [
  completedIdempotencyRecordSchema,
  pendingIdempotencyRecordSchema,
]);

const defaultIdempotencyTtlSeconds = 24 * 60 * 60;
const defaultWaitTimeoutMs = 5_000;
const defaultPollIntervalMs = 25;

export function buildTaxPlanCycleCreateIdempotencyKey(input: {
  tenantId: string;
  idempotencyKey: string;
}): string {
  return `idem:${input.tenantId}:${input.idempotencyKey}`;
}

function isClaimed(setResult: unknown): boolean {
  return setResult === "OK" || setResult === true;
}

function parseCompletedResult(value: string): TaxPlanCycleCreateResult | null {
  const parsed = idempotencyRecordSchema.safeParse(JSON.parse(value) as unknown);

  if (!parsed.success || parsed.data.status !== "completed") {
    return null;
  }

  return parsed.data.result;
}

function pendingValue(): string {
  return JSON.stringify({ status: "pending" });
}

function completedValue(result: TaxPlanCycleCreateResult): string {
  return JSON.stringify({ status: "completed", result });
}

export function createUnavailableTaxPlanCycleCreateIdempotencyStore(): TaxPlanCycleCreateIdempotencyStore {
  return {
    async run() {
      throw new TaxPlanCycleCreateIdempotencyUnavailableError();
    },
  };
}

export function createRedisTaxPlanCycleCreateIdempotencyStore(
  client: TaxPlanCycleCreateIdempotencyClient,
  options: {
    ttlSeconds?: number;
    waitTimeoutMs?: number;
    pollIntervalMs?: number;
  } = {},
): TaxPlanCycleCreateIdempotencyStore {
  const ttlSeconds = options.ttlSeconds ?? defaultIdempotencyTtlSeconds;
  const waitTimeoutMs = options.waitTimeoutMs ?? defaultWaitTimeoutMs;
  const pollIntervalMs = options.pollIntervalMs ?? defaultPollIntervalMs;

  async function readCompletedResult(
    key: string,
  ): Promise<TaxPlanCycleCreateResult | null> {
    const value = await client.get(key);

    if (value === null) {
      return null;
    }

    return parseCompletedResult(value);
  }

  async function waitForCompletedResult(
    key: string,
  ): Promise<TaxPlanCycleCreateResult> {
    const deadline = Date.now() + waitTimeoutMs;

    while (Date.now() < deadline) {
      const existingResult = await readCompletedResult(key);

      if (existingResult !== null) {
        return existingResult;
      }

      await delay(pollIntervalMs);
    }

    throw new TaxPlanCycleCreateIdempotencyInProgressError();
  }

  return {
    async run(input, createResult) {
      const key = buildTaxPlanCycleCreateIdempotencyKey(input);

      try {
        const existingResult = await readCompletedResult(key);

        if (existingResult !== null) {
          return existingResult;
        }

        const claimResult = await client.set(key, pendingValue(), {
          EX: ttlSeconds,
          NX: true,
        });

        if (!isClaimed(claimResult)) {
          return await waitForCompletedResult(key);
        }
      } catch (error) {
        if (error instanceof TaxPlanCycleCreateIdempotencyInProgressError) {
          throw error;
        }

        throw new TaxPlanCycleCreateIdempotencyUnavailableError();
      }

      let result: TaxPlanCycleCreateResult;

      try {
        result = await createResult();
      } catch (error) {
        await client.del(key).catch(() => undefined);
        throw error;
      }

      try {
        await client.set(key, completedValue(result), { EX: ttlSeconds });
      } catch {
        throw new TaxPlanCycleCreateIdempotencyUnavailableError();
      }

      return result;
    },
  };
}
