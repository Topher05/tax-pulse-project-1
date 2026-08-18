import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  type Message,
} from "@aws-sdk/client-sqs";

import {
  IdempotencyInProgressError,
  IdempotencyUnavailableError,
} from "../stageChanged/index.js";
import type { ActionItemRepository } from "../../../repositories/actionItems.js";
import type { ConsumerLogger, IdempotencyGuard } from "../model.js";
import { createActionItemCompletedConsumer } from "./Consumer.js";
import {
  actionItemCompletedCloudEventSchemaV1,
  type ActionItemCompletedCloudEventV1,
} from "./model.js";

interface SnsNotificationEnvelope {
  Type?: unknown;
  Message?: unknown;
}

export function getActionItemCompletedQueueUrlFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const queueUrl = env.TAXPULSE_ACTION_ITEM_COMPLETED_QUEUE_URL?.trim();

  if (!queueUrl) {
    throw new Error(
      "TAXPULSE_ACTION_ITEM_COMPLETED_QUEUE_URL is required to consume action-item-completed events.",
    );
  }

  return queueUrl;
}

export function parseActionItemCompletedSqsMessage(
  message: Message,
): ActionItemCompletedCloudEventV1 {
  if (!message.Body) {
    throw new Error("SQS action-item-completed message body is required.");
  }

  const envelope = JSON.parse(message.Body) as SnsNotificationEnvelope;
  if (envelope.Type !== "Notification" || typeof envelope.Message !== "string") {
    throw new Error("SQS action-item-completed message must contain an SNS notification envelope.");
  }

  return actionItemCompletedCloudEventSchemaV1.parse(JSON.parse(envelope.Message));
}

export function createActionItemCompletedSqsConsumer(
  sqsClient: {
    send(command: ReceiveMessageCommand | DeleteMessageCommand): Promise<unknown>;
  },
  queueUrl: string,
  logger: ConsumerLogger,
  options: {
    repository: Pick<ActionItemRepository, "markCompleted">;
    idempotency: IdempotencyGuard;
    ttlSeconds?: number;
    maxNumberOfMessages?: number;
    waitTimeSeconds?: number;
  },
) {
  const consumer = createActionItemCompletedConsumer({
    repository: options.repository,
    idempotency: options.idempotency,
    ttlSeconds: options.ttlSeconds,
  });
  const maxNumberOfMessages = options.maxNumberOfMessages ?? 10;
  const waitTimeSeconds = options.waitTimeSeconds ?? 20;

  return {
    async consumeActionItemCompletedEventsOnce(): Promise<{
      received: number;
      processed: number;
      duplicate: number;
      failed: number;
    }> {
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
          const event = parseActionItemCompletedSqsMessage(message);
          const result = await consumer.handleActionItemCompletedEvent(event);

          if (result.status === "duplicate") {
            duplicate += 1;
            logger.info({ event_id: event.id, case_id: event.data.case_id }, "Skipped duplicate action-item-completed event from SQS");
          } else {
            processed += 1;
            logger.info({ event_id: event.id, case_id: event.data.case_id }, "Projected action-item completion from SQS");
          }

          if (message.ReceiptHandle) {
            await sqsClient.send(
              new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle }),
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
            { err: error, message_id: message.MessageId },
            "Rejected invalid action-item-completed SQS message",
          );
        }
      }

      return { received: messages.length, processed, duplicate, failed };
    },
  };
}
