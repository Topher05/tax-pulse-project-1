import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  type Message,
} from "@aws-sdk/client-sqs";
import { createClient } from "redis";
import {
  STAGE_CHANGED_CONSUMER_NAME,
  buildIdempotencyKey,
  createSqsStageChangedEventConsumer,
  createRedisIdempotencyStore,
  type ConsumeStageChangedEventsResult,
  type IdempotencyGuard,
  type StageChangedEventConsumerLogger,
  type StageChangedSqsClient,
} from "../../features/taxPlanCycle/infrastructure/stageChangedSqsConsumer.js";
import { createStageChangedCloudEventV1 } from "../../features/taxPlanCycle/infrastructure/stageChangedSnsPublisher.js";
import {
  stageChangedCloudEventSchemaV1,
  type StageChangedCloudEventV1,
} from "../../features/taxPlanCycle/stageChangedEvent.js";

loadEnv();

const cloudTapTenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91";
const cloudTapCaseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e92";
const cloudTapClientId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e93";
const cloudTapEventId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e94";
const cloudTapQueueUrl =
  process.env.TAXPULSE_STAGE_CHANGED_QUEUE_URL?.trim() ||
  "https://sqs.us-east-1.amazonaws.com/123456789012/taxpulse-stage-changed";

export interface CloudTapLogEntry {
  bindings: Record<string, unknown>;
  message: string;
}

export interface CloudTapResult {
  mode: "memory" | "redis";
  queueUrl: string;
  event: StageChangedCloudEventV1;
  idempotencyKey: string;
  firstResult: ConsumeStageChangedEventsResult;
  secondResult: ConsumeStageChangedEventsResult;
  projectionWrites: number;
  sentCommands: Array<"receive" | "delete">;
  infoLogs: CloudTapLogEntry[];
  warnLogs: CloudTapLogEntry[];
}

export interface CloudTapLogger {
  info(bindings: Record<string, unknown>, message: string): void;
  warn(bindings: Record<string, unknown>, message: string): void;
}

function createCaptureLogger(): {
  logger: CloudTapLogger;
  infoLogs: CloudTapLogEntry[];
  warnLogs: CloudTapLogEntry[];
} {
  const infoLogs: CloudTapLogEntry[] = [];
  const warnLogs: CloudTapLogEntry[] = [];

  return {
    logger: {
      info(bindings: Record<string, unknown>, message: string) {
        infoLogs.push({ bindings, message });
      },
      warn(bindings: Record<string, unknown>, message: string) {
        warnLogs.push({ bindings, message });
      },
    },
    infoLogs,
    warnLogs,
  };
}

function createSyntheticSqsClient(messageBody: string): StageChangedSqsClient & {
  sentCommands: Array<"receive" | "delete">;
} {
  const sentCommands: Array<"receive" | "delete"> = [];

  return {
    sentCommands,
    async send(command: ReceiveMessageCommand | DeleteMessageCommand): Promise<unknown> {
      if (command instanceof ReceiveMessageCommand) {
        sentCommands.push("receive");

        const message: Message = {
          MessageId: "sqs-message-018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e95",
          ReceiptHandle: "receipt-handle-018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e96",
          Body: messageBody,
        };

        return {
          Messages: [message],
        };
      }

      sentCommands.push("delete");
      return {};
    },
  };
}

function createInMemoryRedisClient(): IdempotencyGuard {
  const store = new Map<string, string>();

  return {
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    },
    async set(
      key: string,
      value: string,
      options?: { EX?: number; NX?: boolean },
    ): Promise<"OK" | null> {
      if (options?.NX && store.has(key)) {
        return null;
      }

      store.set(key, value);
      return "OK";
    },
    async del(key: string): Promise<number> {
      return store.delete(key) ? 1 : 0;
    },
  };
}

export function buildCloudTapEvent(): StageChangedCloudEventV1 {
  return stageChangedCloudEventSchemaV1.parse(
    createStageChangedCloudEventV1(
      {
        tenantId: cloudTapTenantId,
        caseId: cloudTapCaseId,
        fromStage: "Modeling",
        toStage: "Review",
        actor: "cloud-tap-advisor",
      },
      {
        idFactory: () => cloudTapEventId,
        now: () => new Date("2026-08-03T12:00:00.000Z"),
      },
    ),
  );
}

export function buildCloudTapSnsNotificationEnvelope(
  event: StageChangedCloudEventV1,
): string {
  return JSON.stringify({
    Type: "Notification",
    MessageId: "sns-message-018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e97",
    TopicArn: "arn:aws:sns:us-east-1:123456789012:taxpulse-stage-changed",
    Message: JSON.stringify(event),
  });
}

export async function runCloudTap(
  redisUrl: string | undefined = process.env.TAXPULSE_REDIS_URL?.trim(),
): Promise<CloudTapResult> {
  const event = buildCloudTapEvent();
  const messageBody = buildCloudTapSnsNotificationEnvelope(event);
  const sqsClient = createSyntheticSqsClient(messageBody);
  const capture = createCaptureLogger();
  const projectionWrites: StageChangedCloudEventV1[] = [];
  const memoryRedisClient = createInMemoryRedisClient();
  const redisConnection = redisUrl ? createClient({ url: redisUrl }) : undefined;
  const redisClient: IdempotencyGuard = redisConnection ?? memoryRedisClient;
  const idempotencyStore = createRedisIdempotencyStore(redisClient);
  const consumer = createSqsStageChangedEventConsumer(
    sqsClient,
    cloudTapQueueUrl,
    capture.logger,
    {
      waitTimeSeconds: 0,
      maxNumberOfMessages: 1,
      idempotencyStore,
      handleStageChangedEvent: async (currentEvent) => {
        projectionWrites.push(currentEvent);
      },
    },
  );

  if (redisConnection) {
    await redisConnection.connect();
  }

  try {
    const firstResult = await consumer.consumeStageChangedEventsOnce();
    const secondResult = await consumer.consumeStageChangedEventsOnce();

    return {
      mode: redisUrl ? "redis" : "memory",
      queueUrl: cloudTapQueueUrl,
      event,
      idempotencyKey: buildIdempotencyKey({
        tenantId: event.data.tenant_id,
        consumerName: STAGE_CHANGED_CONSUMER_NAME,
        eventId: event.id,
      }),
      firstResult,
      secondResult,
      projectionWrites: projectionWrites.length,
      sentCommands: sqsClient.sentCommands,
      infoLogs: capture.infoLogs,
      warnLogs: capture.warnLogs,
    };
  } finally {
    if (redisConnection) {
      await redisConnection.quit().catch(() => undefined);
    }
  }
}

export async function main(): Promise<void> {
  const result = await runCloudTap();

  console.log(`Cloud tap mode: ${result.mode}`);
  console.log(`Cloud tap queue: ${result.queueUrl}`);
  console.log(`Event id: ${result.event.id}`);
  console.log(`Idempotency key: ${result.idempotencyKey}`);
  console.log(`First delivery: ${result.firstResult.processed}/${result.firstResult.duplicate}`);
  console.log(`Second delivery: ${result.secondResult.processed}/${result.secondResult.duplicate}`);
  console.log(`Projection writes: ${result.projectionWrites}`);
  console.log(`SQS commands: ${result.sentCommands.join(", ")}`);
  console.log(`Info logs: ${result.infoLogs.length}`);
  console.log(`Warn logs: ${result.warnLogs.length}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
