import type { DeleteMessageCommand, ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

import type { TaxPlanCycleRepository } from "../../../repositories/repository.js";
import type { TaxPlanCycleQueueProjectionItem as QueueProjectionItem } from "../../queueProjection.js";
import { TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME } from "../../queueProjection.js";
import {
  createStageChangedCloudEvent,
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
} from "../../../stageChangedEvent.js";

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
export const createCloudEvent = createStageChangedCloudEvent;

// TODO
// Placeholding for code reviews
// Review structure on branch to old jira-136 ensure deduplicator works the way you designed
// Remove redundant naming convention but keep things specific (SnsPublisher, SqsConsumer etc)
// Do I need to move index.ts? Should each event have it's own? Ask codex and gema
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
  send(command: ReceiveMessageCommand | DeleteMessageCommand): Promise<unknown>;
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
