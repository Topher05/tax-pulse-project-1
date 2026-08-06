import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
  type Message,
  type SQSClientConfig,
} from "@aws-sdk/client-sqs";
import { z } from "zod";

import {
  stageChangedCloudEventSchemaV1,
  type StageChangedCloudEventV1,
} from "../stageChangedEvent.js";

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

export class IdempotencyInProgressError extends Error {
  constructor() {
    super("A stage-changed event with the same id is still being processed.");
    this.name = "IdempotencyInProgressError";
  }
}

export class IdempotencyUnavailableError extends Error {
  constructor() {
    super("Redis idempotency storage is unavailable for the stage-changed consumer.");
    this.name = "IdempotencyUnavailableError";
  }
}

export const STAGE_CHANGED_CONSUMER_NAME = "tax-plan-cycle-stage-changed";

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

export function buildIdempotencyKey(input: IdempotencyInput): string {
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

export interface StageChangedSqsClient {
  send(command: ReceiveMessageCommand | DeleteMessageCommand): Promise<unknown>;
}

export interface StageChangedEventConsumerLogger {
  info(bindings: Record<string, unknown>, message: string): void;
  warn(bindings: Record<string, unknown>, message: string): void;
}

export interface StageChangedSqsConsumerOptions {
  maxNumberOfMessages?: number;
  waitTimeSeconds?: number;
  consumerName?: string;
  idempotencyStore?: IdempotencyStore;
  handleStageChangedEvent?: (event: StageChangedCloudEventV1) => Promise<void> | void;
}

export interface ConsumeStageChangedEventsResult {
  received: number;
  processed: number;
  duplicate: number;
  failed: number;
}

interface StageChangedSnsNotificationEnvelope {
  Type?: unknown;
  Message?: unknown;
}

export function createStageChangedSqsClient(
  env: NodeJS.ProcessEnv = process.env,
): SQSClient {
  const regionName = env.AWS_REGION?.trim() || "us-east-1";
  const endpointUrl = env.TAXPULSE_SQS_ENDPOINT_URL?.trim();
  const clientConfig: SQSClientConfig = {
    region: regionName,
  };

  if (endpointUrl) {
    clientConfig.endpoint = endpointUrl;
    clientConfig.credentials = {
      accessKeyId: env.AWS_ACCESS_KEY_ID?.trim() || "test",
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY?.trim() || "test",
    };
  }

  return new SQSClient(clientConfig);
}

export function getStageChangedQueueUrlFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const queueUrl = env.TAXPULSE_STAGE_CHANGED_QUEUE_URL?.trim();

  if (!queueUrl) {
    throw new Error("TAXPULSE_STAGE_CHANGED_QUEUE_URL is required to consume stage-changed events.");
  }

  return queueUrl;
}

export function parseStageChangedSqsMessage(
  message: Message,
): StageChangedCloudEventV1 {
  if (!message.Body) {
    throw new Error("SQS stage-changed message body is required.");
  }

  const envelope = JSON.parse(message.Body) as StageChangedSnsNotificationEnvelope;

  if (envelope.Type !== "Notification" || typeof envelope.Message !== "string") {
    throw new Error("SQS stage-changed message must contain an SNS notification envelope.");
  }

  return stageChangedCloudEventSchemaV1.parse(JSON.parse(envelope.Message));
}

export function createSqsStageChangedEventConsumer(
  sqsClient: StageChangedSqsClient,
  queueUrl: string,
  logger: StageChangedEventConsumerLogger,
  options: StageChangedSqsConsumerOptions = {},
) {
  const maxNumberOfMessages = options.maxNumberOfMessages ?? 10;
  const waitTimeSeconds = options.waitTimeSeconds ?? 20;

  return {
    async consumeStageChangedEventsOnce(): Promise<ConsumeStageChangedEventsResult> {
      const response = (await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: maxNumberOfMessages,
          WaitTimeSeconds: waitTimeSeconds,
        }),
      )) as { Messages?: Message[] };
      const messages = response.Messages ?? [];
      let processed = 0;
      let duplicate = 0;
      let failed = 0;

      for (const message of messages) {
        try {
          const event = parseStageChangedSqsMessage(message);
          const consumerName = options.consumerName ?? STAGE_CHANGED_CONSUMER_NAME;
          const idempotencyInput = {
            tenantId: event.data.tenant_id,
            consumerName,
            eventId: event.id,
          };

          if (options.idempotencyStore) {
            const claimed = await options.idempotencyStore.claim(idempotencyInput);

            if (!claimed) {
              duplicate += 1;

              logger.info(
                {
                  event_id: event.id,
                  tenant_id: event.data.tenant_id,
                  case_id: event.data.case_id,
                  from_stage: event.data.from_stage,
                  to_stage: event.data.to_stage,
                  actor: event.data.actor,
                },
                "Skipped duplicate stage-changed event from SQS",
              );

              if (message.ReceiptHandle) {
                await sqsClient.send(
                  new DeleteMessageCommand({
                    QueueUrl: queueUrl,
                    ReceiptHandle: message.ReceiptHandle,
                  }),
                );
              }

              continue;
            }
          }

          try {
            await options.handleStageChangedEvent?.(event);
            if (options.idempotencyStore) {
              await options.idempotencyStore.complete(idempotencyInput);
            }
          } catch (error) {
            if (options.idempotencyStore) {
              await options.idempotencyStore.release(idempotencyInput);
            }

            throw error;
          }

          logger.info(
            {
              event_id: event.id,
              tenant_id: event.data.tenant_id,
              case_id: event.data.case_id,
              from_stage: event.data.from_stage,
              to_stage: event.data.to_stage,
              actor: event.data.actor,
            },
            "Received stage-changed event from SQS",
          );

          if (message.ReceiptHandle) {
            await sqsClient.send(
              new DeleteMessageCommand({
                QueueUrl: queueUrl,
                ReceiptHandle: message.ReceiptHandle,
              }),
            );
          }

          processed += 1;
        } catch (error) {
          if (
            error instanceof IdempotencyUnavailableError ||
            error instanceof IdempotencyInProgressError
          ) {
            throw error;
          }

          failed += 1;
          logger.warn(
            {
              err: error,
              message_id: message.MessageId,
            },
            "Rejected invalid stage-changed SQS message",
          );
        }
      }

      return {
        received: messages.length,
        processed,
        duplicate,
        failed,
      };
    },
  };
}
