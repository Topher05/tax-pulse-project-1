import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
  type Message,
  type SQSClientConfig,
} from "@aws-sdk/client-sqs";

import {
  stageChangedCloudEventSchemaV1,
  type StageChangedCloudEventV1,
} from "../../stageChangedEvent.js";
import type { TaxPlanCycle } from "../../taxPlanCycle.js";
import type { TaxPlanCycleRepository } from "../../repositories/repository.js";
import {
  createRedisIdempotencyStore,
  IdempotencyInProgressError,
  IdempotencyUnavailableError,
} from "./EventDeduplicator.js";
import {
  taxPlanCycleQueueProjectionItemSchema as queueProjectionItemSchema,
  type TaxPlanCycleQueueProjectionItem as QueueProjectionItem,
} from "../queueProjection.js";
import type {
  ConsumeResult,
  ConsumerLogger,
  ConsumerOptions,
  IdempotencyGuard,
  Writer,
} from "./model.js";

export const STAGE_CHANGED_CONSUMER_NAME = "tax-plan-cycle-stage-changed";

function todayIsoDateFromEventTime(eventTime: string): string {
  return eventTime.slice(0, 10);
}

function projectTaxPlanCycleToQueueItem(
  tenantId: string,
  cycle: TaxPlanCycle,
  asOfDate: string,
): QueueProjectionItem {
  return queueProjectionItemSchema.parse({
    tenant_id: tenantId,
    case_id: cycle.id,
    client: cycle.client_id,
    stage: cycle.stage,
    owner: cycle.owner,
    priority: cycle.priority,
    due_date: cycle.due_date,
    is_overdue: cycle.due_date < asOfDate,
  });
}

function buildDeduplicationInput(
  event: StageChangedCloudEventV1,
  consumerName: string,
): {
  tenantId: string;
  consumerName: string;
  eventId: string;
} {
  return {
    tenantId: event.data.tenant_id,
    consumerName,
    eventId: event.id,
  };
}

function logBindings(event: StageChangedCloudEventV1): Record<string, unknown> {
  return {
    event_id: event.id,
    tenant_id: event.data.tenant_id,
    case_id: event.data.case_id,
    from_stage: event.data.from_stage,
    to_stage: event.data.to_stage,
    actor: event.data.actor,
  };
}

async function processStageChangedEvent(
  event: StageChangedCloudEventV1,
  options: ConsumerOptions,
): Promise<{ result: "processed" | "duplicate"; item?: QueueProjectionItem }> {
  const consumerName = options.consumerName ?? STAGE_CHANGED_CONSUMER_NAME;
  const idempotencyInput = buildDeduplicationInput(event, consumerName);

  if (options.idempotencyStore) {
    const claimed = await options.idempotencyStore.claim(idempotencyInput);

    if (!claimed) {
      return { result: "duplicate" };
    }
  }

  try {
    if (options.handleStageChangedEvent) {
      await options.handleStageChangedEvent(event);
      if (options.idempotencyStore) {
        await options.idempotencyStore.complete(idempotencyInput);
      }

      return { result: "processed" };
    }

    const repository = options.repository;
    const writer = options.writer;

    if (repository && writer) {
      const cycle = await repository.findByCaseId({
        tenantId: event.data.tenant_id,
        caseId: event.data.case_id,
      });

      if (!cycle) {
        throw new Error(
          `Tax Plan Cycle ${event.data.case_id} was not found for tenant ${event.data.tenant_id}.`,
        );
      }

      const item = projectTaxPlanCycleToQueueItem(
        event.data.tenant_id,
        cycle,
        todayIsoDateFromEventTime(event.time),
      );

      await writer.upsert(item);

      if (options.idempotencyStore) {
        await options.idempotencyStore.complete(idempotencyInput);
      }

      return { result: "processed", item };
    }

    if (options.idempotencyStore) {
      await options.idempotencyStore.complete(idempotencyInput);
    }

    return { result: "processed" };
  } catch (error) {
    if (options.idempotencyStore) {
      await options.idempotencyStore.release(idempotencyInput);
    }

    throw error;
  }
}

export function createConsumer(
  options: ConsumerOptions,
): {
  handleStageChangedEvent(
    event: unknown,
  ): Promise<{ status: "processed" | "duplicate"; item?: QueueProjectionItem }>;
} {
  return {
    async handleStageChangedEvent(event: unknown) {
      const parsedEvent = stageChangedCloudEventSchemaV1.parse(event);
      const processed = await processStageChangedEvent(parsedEvent, options);

      return {
        status: processed.result,
        item: processed.item,
      };
    },
  };
}

export function createRedisConsumer(
  client: IdempotencyGuard,
  repository: Pick<TaxPlanCycleRepository, "findByCaseId">,
  writer: Writer,
  options: {
    consumerName?: string;
    ttlSeconds?: number;
  } = {},
): ReturnType<typeof createConsumer> {
  return createConsumer({
    repository,
    writer,
    consumerName: options.consumerName,
    idempotencyStore: createRedisIdempotencyStore(client, {
      ttlSeconds: options.ttlSeconds,
    }),
  });
}

export function createSqsClient(
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

export function getQueueUrlFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const queueUrl = env.TAXPULSE_STAGE_CHANGED_QUEUE_URL?.trim();

  if (!queueUrl) {
    throw new Error("TAXPULSE_STAGE_CHANGED_QUEUE_URL is required to consume stage-changed events.");
  }

  return queueUrl;
}

interface StageChangedSnsNotificationEnvelope {
  Type?: unknown;
  Message?: unknown;
}

export function parseSqsMessage(
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

export function createSqsConsumer(
  sqsClient: {
    send(command: ReceiveMessageCommand | DeleteMessageCommand): Promise<unknown>;
  },
  queueUrl: string,
  logger: ConsumerLogger,
  options: {
    maxNumberOfMessages?: number;
    waitTimeSeconds?: number;
  } & ConsumerOptions = {},
) {
  const maxNumberOfMessages = options.maxNumberOfMessages ?? 10;
  const waitTimeSeconds = options.waitTimeSeconds ?? 20;
  const consumer = createConsumer(options);

  return {
    handleStageChangedEvent: consumer.handleStageChangedEvent,
    async consumeStageChangedEventsOnce(): Promise<ConsumeResult> {
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
          const event = parseSqsMessage(message);
          const result = await consumer.handleStageChangedEvent(event);

          if (result.status === "duplicate") {
            duplicate += 1;
            logger.info(logBindings(event), "Skipped duplicate stage-changed event from SQS");
          } else {
            processed += 1;
            logger.info(logBindings(event), "Received stage-changed event from SQS");
          }

          if (message.ReceiptHandle) {
            await sqsClient.send(
              new DeleteMessageCommand({
                QueueUrl: queueUrl,
                ReceiptHandle: message.ReceiptHandle,
              }),
            );
          }
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
