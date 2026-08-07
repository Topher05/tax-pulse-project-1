import { describe, expect, test, vi } from "vitest";
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
} from "@aws-sdk/client-sqs";

import {
  createRedisIdempotencyStore,
  createSnsStageChangedEventPublisher,
  createSqsStageChangedEventConsumer,
  buildIdempotencyKey,
  STAGE_CHANGED_CONSUMER_NAME,
  getStageChangedQueueUrlFromEnv,
  parseStageChangedSqsMessage,
  PublishCommand,
  stageChangedCloudEventSchemaV1,
  type IdempotencyGuard,
} from "../../../../src/typescript/index.js";

const transitionInput = {
  tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e81",
  caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e82",
  fromStage: "Intake" as const,
  toStage: "Data Aggregation" as const,
  actor: "advisor-132",
};

function createInMemoryRedisClient(
  seed: Record<string, string> = {},
): IdempotencyGuard & {
  store: Map<string, string>;
  getCalls: string[];
  setCalls: Array<{
    key: string;
    value: string;
    options?: { EX?: number; NX?: boolean };
  }>;
} {
  const store = new Map(Object.entries(seed));
  const getCalls: string[] = [];
  const setCalls: Array<{
    key: string;
    value: string;
    options?: { EX?: number; NX?: boolean };
  }> = [];

  return {
    store,
    getCalls,
    setCalls,
    async get(key) {
      getCalls.push(key);
      return store.get(key) ?? null;
    },
    async set(key, value, options) {
      setCalls.push({ key, value, options });

      if (options?.NX && store.has(key)) {
        return null;
      }

      store.set(key, value);
      return "OK";
    },
    async del(key) {
      store.delete(key);
      return 1;
    },
  };
}

function createSnsNotificationEnvelope(message: string): string {
  return JSON.stringify({
    Type: "Notification",
    MessageId: "sns-message-132",
    TopicArn: "arn:aws:sns:us-east-1:123456789012:taxpulse-stage-changed",
    Message: message,
  });
}

describe("stage-changed SQS consumer", () => {
  test("receives and parses a published stage-changed event from an SNS envelope", async () => {
    const snsSend = vi.fn(async (_command: PublishCommand) => ({}));
    const publisher = createSnsStageChangedEventPublisher(
      { send: snsSend },
      "arn:aws:sns:us-east-1:123456789012:taxpulse-stage-changed",
      {
        idFactory: () => "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e83",
        now: () => new Date("2026-07-01T14:00:00.000Z"),
      },
    );

    await publisher.publishStageChanged(transitionInput);

    const publishedCommand = snsSend.mock.calls[0]?.[0];
    expect(publishedCommand).toBeInstanceOf(PublishCommand);
    const sqsMessageBody = createSnsNotificationEnvelope(
      String(publishedCommand?.input.Message),
    );
    const sqsSend = vi.fn(async (command: ReceiveMessageCommand | DeleteMessageCommand) => {
      if (command instanceof ReceiveMessageCommand) {
        return {
          Messages: [
            {
              MessageId: "sqs-message-132",
              ReceiptHandle: "receipt-handle-132",
              Body: sqsMessageBody,
            },
          ],
        };
      }

      return {};
    });
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
    };
    const consumer = createSqsStageChangedEventConsumer(
      { send: sqsSend },
      "https://sqs.us-east-1.amazonaws.com/123456789012/taxpulse-stage-changed",
      logger,
      { waitTimeSeconds: 0 },
    );

    const result = await consumer.consumeStageChangedEventsOnce();

    expect(result).toEqual({
      received: 1,
      processed: 1,
      duplicate: 0,
      failed: 0,
    });
    const parsedEvent = parseStageChangedSqsMessage({
      Body: sqsMessageBody,
    });
    expect(stageChangedCloudEventSchemaV1.parse(parsedEvent)).toMatchObject({
      id: "stage-transition-018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e83",
      data: {
        case_id: transitionInput.caseId,
        tenant_id: transitionInput.tenantId,
        from_stage: "Intake",
        to_stage: "Data Aggregation",
        actor: "advisor-132",
      },
    });
    expect(logger.info).toHaveBeenCalledWith(
      {
        event_id: "stage-transition-018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e83",
        tenant_id: transitionInput.tenantId,
        case_id: transitionInput.caseId,
        from_stage: "Intake",
        to_stage: "Data Aggregation",
        actor: "advisor-132",
      },
      "Received stage-changed event from SQS",
    );
    expect(logger.warn).not.toHaveBeenCalled();
    expect(sqsSend).toHaveBeenCalledTimes(2);
    const deleteCommand = sqsSend.mock.calls[1]?.[0];
    expect(deleteCommand).toBeInstanceOf(DeleteMessageCommand);
    expect(deleteCommand?.input).toMatchObject({
      QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/taxpulse-stage-changed",
      ReceiptHandle: "receipt-handle-132",
    });
  });

  test("skips duplicate stage-changed deliveries with Redis idempotency", async () => {
    const redisClient = createInMemoryRedisClient();
    const idempotencyStore = createRedisIdempotencyStore(redisClient);
    const projectionWrites: string[] = [];
    const sqsSend = vi.fn(async (command: ReceiveMessageCommand | DeleteMessageCommand) => {
      if (command instanceof ReceiveMessageCommand) {
        return {
          Messages: [
            {
              MessageId: "sqs-message-duplicate-132",
              ReceiptHandle: "receipt-handle-duplicate-132",
              Body: createSnsNotificationEnvelope(
                JSON.stringify(
                  stageChangedCloudEventSchemaV1.parse({
                    specversion: "1.0",
                    id: "stage-transition-duplicate-132",
                    source: "taxpulse.platform.tax-plan-cycle",
                    type: "com.taxpulse.tax_plan_cycle.stage_changed.v1",
                    time: "2026-07-01T14:00:00.000Z",
                    datacontenttype: "application/json",
                    dataschema: "taxpulse://schemas/platform/stage-changed/v1",
                    data: {
                      tenant_id: transitionInput.tenantId,
                      case_id: transitionInput.caseId,
                      from_stage: "Intake",
                      to_stage: "Data Aggregation",
                      actor: "advisor-132",
                    },
                  }),
                ),
              ),
            },
          ],
        };
      }

      return {};
    });
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
    };
    const consumer = createSqsStageChangedEventConsumer(
      { send: sqsSend },
      "https://sqs.us-east-1.amazonaws.com/123456789012/taxpulse-stage-changed",
      logger,
      {
        waitTimeSeconds: 0,
        idempotencyStore,
        handleStageChangedEvent: async (event) => {
          projectionWrites.push(event.id);
        },
      },
    );

    const firstResult = await consumer.consumeStageChangedEventsOnce();
    const secondResult = await consumer.consumeStageChangedEventsOnce();
    const redisKey = buildIdempotencyKey({
      tenantId: transitionInput.tenantId,
      consumerName: STAGE_CHANGED_CONSUMER_NAME,
      eventId: "stage-transition-duplicate-132",
    });

    expect(firstResult).toEqual({
      received: 1,
      processed: 1,
      duplicate: 0,
      failed: 0,
    });
    expect(secondResult).toEqual({
      received: 1,
      processed: 0,
      duplicate: 1,
      failed: 0,
    });
    expect(projectionWrites).toEqual(["stage-transition-duplicate-132"]);
    expect(redisClient.store.get(redisKey)).toBe(
      JSON.stringify({ status: "completed" }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: "stage-transition-duplicate-132",
      }),
      "Skipped duplicate stage-changed event from SQS",
    );
  });

  test("fails closed when Redis cannot be read for idempotency", async () => {
    const sqsSend = vi.fn(async (command: ReceiveMessageCommand | DeleteMessageCommand) => {
      if (command instanceof ReceiveMessageCommand) {
        return {
          Messages: [
            {
              MessageId: "sqs-message-redis-132",
              ReceiptHandle: "receipt-handle-redis-132",
              Body: createSnsNotificationEnvelope(
                JSON.stringify(
                  stageChangedCloudEventSchemaV1.parse({
                    specversion: "1.0",
                    id: "stage-transition-redis-132",
                    source: "taxpulse.platform.tax-plan-cycle",
                    type: "com.taxpulse.tax_plan_cycle.stage_changed.v1",
                    time: "2026-07-01T14:00:00.000Z",
                    datacontenttype: "application/json",
                    dataschema: "taxpulse://schemas/platform/stage-changed/v1",
                    data: {
                      tenant_id: transitionInput.tenantId,
                      case_id: transitionInput.caseId,
                      from_stage: "Intake",
                      to_stage: "Data Aggregation",
                      actor: "advisor-132",
                    },
                  }),
                ),
              ),
            },
          ],
        };
      }

      return {};
    });
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
    };
    const redisClient: IdempotencyGuard = {
      async get(): Promise<string | null> {
        throw new Error("redis unavailable");
      },
      async set(): Promise<"OK"> {
        throw new Error("redis unavailable");
      },
      async del(): Promise<number> {
        throw new Error("redis unavailable");
      },
    };
    const idempotencyStore = createRedisIdempotencyStore(redisClient);
    const consumer = createSqsStageChangedEventConsumer(
      { send: sqsSend },
      "https://sqs.us-east-1.amazonaws.com/123456789012/taxpulse-stage-changed",
      logger,
      {
        waitTimeSeconds: 0,
        idempotencyStore,
      },
    );

    await expect(consumer.consumeStageChangedEventsOnce()).rejects.toThrow(
      "Redis idempotency storage is unavailable for the stage-changed consumer.",
    );
    expect(logger.warn).not.toHaveBeenCalled();
    expect(sqsSend).toHaveBeenCalledTimes(1);
  });

  test("rejects invalid CloudEvents without deleting the SQS message", async () => {
    const sqsSend = vi.fn(async (command: ReceiveMessageCommand | DeleteMessageCommand) => {
      if (command instanceof ReceiveMessageCommand) {
        return {
          Messages: [
            {
              MessageId: "sqs-message-invalid-132",
              ReceiptHandle: "receipt-handle-invalid-132",
              Body: createSnsNotificationEnvelope(
                JSON.stringify({
                  specversion: "1.0",
                  id: "stage-transition-invalid-132",
                }),
              ),
            },
          ],
        };
      }

      return {};
    });
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
    };
    const consumer = createSqsStageChangedEventConsumer(
      { send: sqsSend },
      "https://sqs.us-east-1.amazonaws.com/123456789012/taxpulse-stage-changed",
      logger,
      { waitTimeSeconds: 0 },
    );

    const result = await consumer.consumeStageChangedEventsOnce();

    expect(result).toEqual({
      received: 1,
      processed: 0,
      duplicate: 0,
      failed: 1,
    });
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        message_id: "sqs-message-invalid-132",
      }),
      "Rejected invalid stage-changed SQS message",
    );
    expect(sqsSend).toHaveBeenCalledTimes(1);
  });

  test("rejects missing queue configuration", () => {
    expect(() =>
      getStageChangedQueueUrlFromEnv({
        TAXPULSE_STAGE_CHANGED_QUEUE_URL: "   ",
      }),
    ).toThrow("TAXPULSE_STAGE_CHANGED_QUEUE_URL is required");
  });
});
