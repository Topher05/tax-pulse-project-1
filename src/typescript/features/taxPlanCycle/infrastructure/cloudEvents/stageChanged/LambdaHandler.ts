import type { Message } from "@aws-sdk/client-sqs";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { createClient, type RedisClientType } from "redis";

import {
  createTaxPlanCycleQueueDynamoDocumentClient,
} from "../../queueDynamoStore.js";
import {
  TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_CASE_KEY,
  TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
  TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY,
} from "../../queueProjection.js";
import {
  type ConsumerLogger,
  type ConsumerHandleResult,
  type IdempotencyGuard,
} from "./model.js";
import {
  STAGE_CHANGED_CONSUMER_NAME,
  createConsumer,
  parseSqsMessage,
} from "./SqsConsumer.js";
import {
  createRedisIdempotencyStore,
} from "./EventDeduplicator.js";
import type { StageChangedCloudEventV1 } from "../../../stageChangedEvent.js";

export interface StageChangedLambdaSqsRecord {
  messageId: string;
  body: string;
}

export interface StageChangedLambdaSqsEvent {
  Records: StageChangedLambdaSqsRecord[];
}

export interface StageChangedLambdaBatchItemFailure {
  itemIdentifier: string;
}

export interface StageChangedLambdaBatchResponse {
  batchItemFailures: StageChangedLambdaBatchItemFailure[];
}

export interface StageChangedLambdaHandlerDependencies {
  consumer?: {
    handleStageChangedEvent(event: unknown): Promise<ConsumerHandleResult>;
  };
  projectionUpdater?: StageChangedProjectionUpdater;
  logger?: ConsumerLogger;
}

export interface StageChangedLambdaRuntimeDependencies {
  env?: NodeJS.ProcessEnv;
  logger?: ConsumerLogger;
  projectionUpdater?: StageChangedProjectionUpdater;
  dynamoDbClient?: StageChangedProjectionDynamoClient;
  redisClientFactory?: (redisUrl: string) => IdempotencyGuard & {
    connect?: () => Promise<unknown>;
    quit?: () => Promise<unknown>;
  };
}

export interface StageChangedProjectionDynamoClient {
  send(command: UpdateCommand): Promise<unknown>;
}

export interface StageChangedProjectionUpdater {
  updateStage(event: StageChangedCloudEventV1): Promise<void>;
}

interface StageChangedLambdaRecordResult {
  status: "processed" | "duplicate";
}

function toSqsMessage(record: StageChangedLambdaSqsRecord): Message {
  return {
    MessageId: record.messageId,
    Body: record.body,
  };
}

function logBindings(record: StageChangedLambdaSqsRecord): Record<string, unknown> {
  return {
    message_id: record.messageId,
  };
}

function defaultLogger(): ConsumerLogger {
  return {
    info(bindings, message) {
      console.info(message, bindings);
    },
    warn(bindings, message) {
      console.warn(message, bindings);
    },
  };
}

export function createStageChangedProjectionUpdater(
  dynamoDbClient: StageChangedProjectionDynamoClient,
  tableName: string = TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
): StageChangedProjectionUpdater {
  return {
    async updateStage(event) {
      await dynamoDbClient.send(
        new UpdateCommand({
          TableName: tableName,
          Key: {
            [TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY]: event.data.tenant_id,
            [TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_CASE_KEY]: event.data.case_id,
          },
          UpdateExpression: "SET #stage = :stage",
          ExpressionAttributeNames: {
            "#stage": "stage",
          },
          ExpressionAttributeValues: {
            ":stage": event.data.to_stage,
          },
        }),
      );
    },
  };
}

export function createStageChangedLambdaHandler(
  dependencies: StageChangedLambdaHandlerDependencies,
): (event: StageChangedLambdaSqsEvent) => Promise<StageChangedLambdaBatchResponse> {
  const logger = dependencies.logger ?? defaultLogger();
  const projectionUpdater = dependencies.projectionUpdater;
  const consumer = dependencies.consumer;

  if (!consumer && !projectionUpdater) {
    throw new Error("The stage-changed Lambda handler requires a consumer or projection updater.");
  }

  async function handleRecord(record: StageChangedLambdaSqsRecord): Promise<{
    event: StageChangedCloudEventV1;
    result: StageChangedLambdaRecordResult;
  }> {
    const parsedEvent = parseSqsMessage(toSqsMessage(record));

    if (consumer) {
      const result = await consumer.handleStageChangedEvent(parsedEvent);

      return {
        event: parsedEvent,
        result,
      };
    }

    await projectionUpdater?.updateStage(parsedEvent);

    return {
      event: parsedEvent,
      result: { status: "processed" },
    };
  }

  return async function stageChangedLambdaHandler(
    event: StageChangedLambdaSqsEvent,
  ): Promise<StageChangedLambdaBatchResponse> {
    const batchItemFailures: StageChangedLambdaBatchItemFailure[] = [];

    for (const record of event.Records) {
      try {
        const handled = await handleRecord(record);

        logger.info(
          {
            ...logBindings(record),
            event_id: handled.event.id,
            tenant_id: handled.event.data.tenant_id,
            case_id: handled.event.data.case_id,
            from_stage: handled.event.data.from_stage,
            to_stage: handled.event.data.to_stage,
            status: handled.result.status,
          },
          "Processed stage-changed Lambda SQS record",
        );
      } catch (error) {
        batchItemFailures.push({
          itemIdentifier: record.messageId,
        });
        logger.warn(
          {
            ...logBindings(record),
            err: error,
          },
          "Failed stage-changed Lambda SQS record",
        );
      }
    }

    return {
      batchItemFailures,
    };
  };
}

export function createStageChangedLambdaRuntimeHandler(
  dependencies: StageChangedLambdaRuntimeDependencies = {},
): (event: StageChangedLambdaSqsEvent) => Promise<StageChangedLambdaBatchResponse> {
  const env = dependencies.env ?? process.env;
  const logger = dependencies.logger ?? defaultLogger();

  return async function stageChangedLambdaRuntimeHandler(
    event: StageChangedLambdaSqsEvent,
  ): Promise<StageChangedLambdaBatchResponse> {
    const projectionUpdater = dependencies.projectionUpdater
      ?? createStageChangedProjectionUpdater(
        dependencies.dynamoDbClient ?? createTaxPlanCycleQueueDynamoDocumentClient(env),
        env.TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE?.trim()
          || TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
      );
    const redisUrl = env.TAXPULSE_REDIS_URL?.trim();
    const redisClient = redisUrl
      ? (dependencies.redisClientFactory
        ? dependencies.redisClientFactory(redisUrl)
        : createClient({ url: redisUrl }) as RedisClientType)
      : null;
    const consumer = redisClient
      ? createConsumer({
        consumerName: STAGE_CHANGED_CONSUMER_NAME,
        idempotencyStore: createRedisIdempotencyStore(redisClient),
        handleStageChangedEvent: async (stageChangedEvent) => {
          await projectionUpdater.updateStage(stageChangedEvent);
        },
      })
      : undefined;

    if (redisClient?.connect) {
      await redisClient.connect();
    }

    try {
      return await createStageChangedLambdaHandler({
        consumer,
        projectionUpdater,
        logger,
      })(event);
    } finally {
      if (redisClient?.quit) {
        await redisClient.quit().catch(() => undefined);
      }
    }
  };
}

export const handler = createStageChangedLambdaRuntimeHandler();
