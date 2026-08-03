import type { PutCommand } from "@aws-sdk/lib-dynamodb";

import type { TaxPlanCycleRepository } from "../../repositories/repository.js";
import type { TaxPlanCycleQueueProjectionItem as QueueProjectionItem } from "../queueProjection.js";

export interface WriterClient {
  send(command: PutCommand): Promise<unknown>;
}

export interface Writer {
  upsert(item: QueueProjectionItem): Promise<void>;
}

export interface IdempotencyGuard {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { EX?: number; NX?: boolean },
  ): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export interface IdempotencyInput {
  tenantId: string;
  consumerName: string;
  eventId: string;
}

export interface IdempotencyStore {
  claim(input: IdempotencyInput): Promise<boolean>;
  complete(input: IdempotencyInput): Promise<void>;
  release(input: IdempotencyInput): Promise<void>;
}

export interface ConsumerHandleResult {
  status: "processed" | "duplicate";
  item?: QueueProjectionItem;
}

export interface ConsumerOptions {
  repository: Pick<TaxPlanCycleRepository, "findByCaseId">;
  writer: Writer;
  idempotencyStore: IdempotencyStore;
  consumerName?: string;
}
