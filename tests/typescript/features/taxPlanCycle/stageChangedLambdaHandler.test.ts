import { describe, expect, test, vi } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";

import {
  STAGE_CHANGED_CONSUMER_NAME,
  buildIdempotencyKey,
  createConsumer,
  createRedisIdempotencyStore,
  createStageChangedCloudEvent,
  createStageChangedLambdaHandler,
  createStageChangedProjectionUpdater,
  stageChangedCloudEventSchemaV1,
  type IdempotencyGuard,
  type StageChangedLambdaSqsEvent,
} from "../../../../src/typescript/index.js";

function createInMemoryRedisClient(
  seed: Record<string, string> = {},
): IdempotencyGuard & {
  store: Map<string, string>;
} {
  const store = new Map(Object.entries(seed));

  return {
    store,
    async get(key) {
      return store.get(key) ?? null;
    },
    async set(key, value, options) {
      if (options?.NX && store.has(key)) {
        return null;
      }

      store.set(key, value);
      return "OK";
    },
    async del(key) {
      return store.delete(key) ? 1 : 0;
    },
  };
}

const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e61";
const caseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e62";

function buildStageChangedEvent(
  eventId: string = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e64",
) {
  return stageChangedCloudEventSchemaV1.parse(
    createStageChangedCloudEvent(
      {
        tenantId,
        caseId,
        fromStage: "Modeling",
        toStage: "Review",
        actor: "advisor-001",
      },
      {
        idFactory: () => eventId,
        now: () => new Date("2026-07-22T12:00:00.000Z"),
      },
    ),
  );
}

function createSnsNotificationEnvelope(message: unknown): string {
  return JSON.stringify({
    Type: "Notification",
    MessageId: "sns-message-159",
    TopicArn: "arn:aws:sns:us-east-1:123456789012:taxpulse-stage-changed",
    Message: JSON.stringify(message),
  });
}

function createLambdaEvent(
  records: Array<{ messageId: string; body: string }>,
): StageChangedLambdaSqsEvent {
  return {
    Records: records,
  };
}

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
  };
}

describe("stage-changed Lambda handler", () => {
  test("updates the queue projection stage for a valid Lambda SQS batch record", async () => {
    const projectionUpdater = {
      updateStage: vi.fn(async () => undefined),
    };
    const logger = createLogger();
    const handler = createStageChangedLambdaHandler({
      projectionUpdater,
      logger,
    });
    const stageChangedEvent = buildStageChangedEvent();

    const result = await handler(
      createLambdaEvent([
        {
          messageId: "sqs-message-success-159",
          body: createSnsNotificationEnvelope(stageChangedEvent),
        },
      ]),
    );

    expect(result).toEqual({
      batchItemFailures: [],
    });
    expect(projectionUpdater.updateStage).toHaveBeenCalledWith(stageChangedEvent);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        message_id: "sqs-message-success-159",
        tenant_id: tenantId,
        case_id: caseId,
        from_stage: "Modeling",
        to_stage: "Review",
        status: "processed",
      }),
      "Processed stage-changed Lambda SQS record",
    );
  });

  test("returns only failed message ids for partial batch retry", async () => {
    const projectionUpdater = {
      updateStage: vi.fn(async () => undefined),
    };
    const logger = createLogger();
    const handler = createStageChangedLambdaHandler({
      projectionUpdater,
      logger,
    });

    const result = await handler(
      createLambdaEvent([
        {
          messageId: "sqs-message-valid-159",
          body: createSnsNotificationEnvelope(buildStageChangedEvent()),
        },
        {
          messageId: "sqs-message-invalid-159",
          body: createSnsNotificationEnvelope({
            specversion: "1.0",
            id: "stage-transition-invalid-159",
          }),
        },
      ]),
    );

    expect(result).toEqual({
      batchItemFailures: [
        {
          itemIdentifier: "sqs-message-invalid-159",
        },
      ],
    });
    expect(projectionUpdater.updateStage).toHaveBeenCalledTimes(1);
    expect(projectionUpdater.updateStage).toHaveBeenCalledWith(buildStageChangedEvent());
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        message_id: "sqs-message-invalid-159",
      }),
      "Failed stage-changed Lambda SQS record",
    );
  });

  test("returns a failed message id when projection processing fails", async () => {
    const projectionUpdater = {
      updateStage: vi.fn(async () => {
        throw new Error("DynamoDB projection update failed");
      }),
    };
    const logger = createLogger();
    const handler = createStageChangedLambdaHandler({
      projectionUpdater,
      logger,
    });

    const result = await handler(
      createLambdaEvent([
        {
          messageId: "sqs-message-missing-cycle-159",
          body: createSnsNotificationEnvelope(buildStageChangedEvent()),
        },
      ]),
    );

    expect(result).toEqual({
      batchItemFailures: [
        {
          itemIdentifier: "sqs-message-missing-cycle-159",
        },
      ],
    });
    expect(projectionUpdater.updateStage).toHaveBeenCalledTimes(1);
  });

  test("supports the SCRUM-136 Redis-backed consumer path and skips duplicate deliveries", async () => {
    const duplicateEvent = buildStageChangedEvent("stage-transition-duplicate-159");
    const redisClient = createInMemoryRedisClient();
    const logger = createLogger();
    const projectionUpdater = {
      updateStage: vi.fn(async () => undefined),
    };
    const consumer = createConsumer({
      consumerName: STAGE_CHANGED_CONSUMER_NAME,
      idempotencyStore: createRedisIdempotencyStore(redisClient),
      handleStageChangedEvent: async (event) => {
        await projectionUpdater.updateStage(event);
      },
    });
    const handler = createStageChangedLambdaHandler({
      consumer,
      logger,
    });

    const firstResult = await handler(
      createLambdaEvent([
        {
          messageId: "sqs-message-first-159",
          body: createSnsNotificationEnvelope(duplicateEvent),
        },
      ]),
    );
    const secondResult = await handler(
      createLambdaEvent([
        {
          messageId: "sqs-message-second-159",
          body: createSnsNotificationEnvelope(duplicateEvent),
        },
      ]),
    );
    const redisKey = buildIdempotencyKey({
      tenantId,
      consumerName: STAGE_CHANGED_CONSUMER_NAME,
      eventId: duplicateEvent.id,
    });

    expect(firstResult).toEqual({
      batchItemFailures: [],
    });
    expect(secondResult).toEqual({
      batchItemFailures: [],
    });
    expect(projectionUpdater.updateStage).toHaveBeenCalledTimes(1);
    expect(redisClient.store.get(redisKey)).toBe(
      JSON.stringify({ status: "completed" }),
    );
    expect(logger.info).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        message_id: "sqs-message-second-159",
        status: "duplicate",
      }),
      "Processed stage-changed Lambda SQS record",
    );
  });

  test("uses DynamoDB UpdateCommand to set only the projected stage", async () => {
    const send = vi.fn(async (_command: UpdateCommand) => ({}));
    const projectionUpdater = createStageChangedProjectionUpdater(
      { send },
      "taxpulse_plan_cycle_queue_projection",
    );

    await projectionUpdater.updateStage(buildStageChangedEvent());

    expect(send).toHaveBeenCalledTimes(1);
    const updateCommand = send.mock.calls[0]?.[0];

    expect(updateCommand).toBeInstanceOf(UpdateCommand);
    expect(updateCommand?.input).toEqual({
      TableName: "taxpulse_plan_cycle_queue_projection",
      Key: {
        tenant_id: tenantId,
        case_id: caseId,
      },
      UpdateExpression: "SET #stage = :stage",
      ExpressionAttributeNames: {
        "#stage": "stage",
      },
      ExpressionAttributeValues: {
        ":stage": "Review",
      },
    });
  });
});
