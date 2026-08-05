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
} from "../stageChangedEvent.js";

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
}

export interface ConsumeStageChangedEventsResult {
  received: number;
  processed: number;
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
      let failed = 0;

      for (const message of messages) {
        try {
          const event = parseStageChangedSqsMessage(message);

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
        failed,
      };
    },
  };
}
