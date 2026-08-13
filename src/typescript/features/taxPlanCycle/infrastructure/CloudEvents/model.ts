import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";

import type { TaxPlanCycleRepository } from "../../repositories/repository.js";
import { TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME } from "../queueProjection.js";
import {
  createStageChangedCloudEventV1,
  stageChangedCloudEventSchemaV1,
  stageChangedEventDataSchema,
  stageChangedEventDataSchemaV1,
  stageChangedEventSchemaVersion,
  stageChangedEventSource,
  stageChangedEventType,
  type CreateStageChangedCloudEventOptions,
  type StageChangedCloudEventV1,
  type StageChangedEventDataV1,
  type StageChangedEventPublishInput,
} from "../../stageChangedEvent.js";
import type { TaxPlanCycleQueueProjectionItem as QueueProjectionItem } from "../queueProjection.js";

export const eventType = stageChangedEventType;
export const eventSource = stageChangedEventSource;
export const eventDataSchemaName = stageChangedEventDataSchema;
export const eventSchemaVersion = stageChangedEventSchemaVersion;

export type CloudEventPublishInput = StageChangedEventPublishInput;
export type CreateCloudEventOptions = CreateStageChangedCloudEventOptions;
export type CloudEventDataV1 = StageChangedEventDataV1;
export type CloudEventV1 = StageChangedCloudEventV1;
export const cloudEventSchemaV1 = stageChangedCloudEventSchemaV1;
export const eventDataSchemaV1 = stageChangedEventDataSchemaV1;
export const eventDataSchema = stageChangedEventDataSchema;
export const createCloudEvent = createStageChangedCloudEventV1;

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
  namespace?: string;
}

export interface IdempotencyStore {
  claim(input: IdempotencyInput): Promise<boolean>;
  complete(input: IdempotencyInput): Promise<void>;
  release(input: IdempotencyInput): Promise<void>;
}

export interface WriterClient {
  send(command: PutCommand): Promise<unknown>;
}

export interface Writer {
  upsert(item: QueueProjectionItem): Promise<void>;
}

export function createWriter(
  client: WriterClient,
  tableName: string = TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
): Writer {
  return {
    async upsert(item: QueueProjectionItem): Promise<void> {
      await client.send(
        new PutCommand({
          TableName: tableName,
          Item: item,
        }),
      );
    },
  };
}

export interface ConsumerHandleResult {
  status: "processed" | "duplicate";
  item?: QueueProjectionItem;
}

export interface ConsumerOptions {
  consumerName?: string;
  idempotencyStore?: IdempotencyStore;
  repository?: Pick<TaxPlanCycleRepository, "findByCaseId">;
  writer?: Writer;
  handleStageChangedEvent?: (event: CloudEventV1) => Promise<void> | void;
}

export interface SqsConsumerClient {
  send(command: import("@aws-sdk/client-sqs").ReceiveMessageCommand | import("@aws-sdk/client-sqs").DeleteMessageCommand): Promise<unknown>;
}

export interface ConsumerLogger {
  info(bindings: Record<string, unknown>, message: string): void;
  warn(bindings: Record<string, unknown>, message: string): void;
}

export interface ConsumeResult {
  received: number;
  processed: number;
  duplicate: number;
  failed: number;
}

export interface SqsConsumerOptions extends ConsumerOptions {
  maxNumberOfMessages?: number;
  waitTimeSeconds?: number;
}
