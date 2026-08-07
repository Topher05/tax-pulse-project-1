import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  type Message,
} from "@aws-sdk/client-sqs";
import { createClient } from "redis";
import {
  ACTION_ITEM_CREATED_CONSUMER_NAME,
  ACTION_ITEM_CREATED_IDEMPOTENCY_NAMESPACE,
  STAGE_CHANGED_CONSUMER_NAME,
  buildIdempotencyKey,
  createRedisConsumer,
  createPresentToClientSaga,
  createStageChangedCloudEvent,
  type ActionItemCreatedEventInput,
  type PresentToClientSaga,
  type StageChangedEventPublishInput,
  type TaxPlanCycle,
} from "../../features/taxPlanCycle/infrastructure/cloudEvents/index.js";
import {
  createActionItemCreatedCloudEvent,
  createRedisActionItemConsumer,
  type ActionItemCreatedCloudEventV1,
  type ActionItemCreatedConsumerHandleResult,
} from "../../features/taxPlanCycle/infrastructure/cloudEvents/actionItemCreated/index.js";
import {
  createRedisIdempotencyStore,
  createSqsConsumer,
  type ConsumeStageChangedEventsResult,
  type IdempotencyGuard,
  type ConsumerLogger as StageChangedEventConsumerLogger,
  type SqsConsumerClient as StageChangedSqsClient,
  createCloudEventV1,
} from "../../features/taxPlanCycle/infrastructure/cloudEvents/stageChanged/index.js";
import {
  stageChangedCloudEventSchemaV1,
  type StageChangedCloudEventV1,
} from "../../features/taxPlanCycle/stageChangedEvent.js";

export interface CloudTapTraceWriter {
  set(
    key: string,
    value: string,
    options?: { EX?: number; NX?: boolean },
  ): Promise<unknown>;
}

loadEnv();

const cloudTapTenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91";
const cloudTapCaseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e92";
const cloudTapClientId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e93";
const cloudTapEventId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e94";
const cloudTapActionItemEventId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e95";
const cloudTapMockIdempotencyValue = JSON.stringify({ status: "completed" });
const cloudTapRedisUrl =
  process.env.TAXPULSE_REDIS_URL?.trim() ?? "redis://localhost:6379";
const cloudTapQueueUrl =
  process.env.TAXPULSE_STAGE_CHANGED_QUEUE_URL?.trim() ||
  "https://sqs.us-east-1.amazonaws.com/123456789012/taxpulse-stage-changed";

export interface CloudTapLogEntry {
  bindings: Record<string, unknown>;
  message: string;
}

export interface CloudTapResult {
  mode: "redis";
  queueUrl: string;
  event: StageChangedCloudEventV1;
  idempotencyKey: string;
  firstResult: ConsumeStageChangedEventsResult;
  secondResult: ConsumeStageChangedEventsResult;
  projectionWrites: number;
  sentCommands: Array<"receive" | "delete">;
  infoLogs: CloudTapLogEntry[];
  warnLogs: CloudTapLogEntry[];
  actionItemEvent: ActionItemCreatedCloudEventV1;
  actionItemIdempotencyKey: string;
  actionItemFirstResult: ActionItemCreatedConsumerHandleResult;
  actionItemSecondResult: ActionItemCreatedConsumerHandleResult;
  actionItemProjectionWrites: number;
  presentToClient: PresentToClientCloudTapResult;
}

export interface PresentToClientCloudTapSequenceResult {
  finalStage: TaxPlanCycle["stage"];
  actionItemStatus: "processed" | "failed";
  rollbackCount: number;
  stageChangedEvents: number;
}

export interface PresentToClientCloudTapResult {
  success: PresentToClientCloudTapSequenceResult;
  compensation: PresentToClientCloudTapSequenceResult;
}

export interface CloudTapLogger {
  info(bindings: Record<string, unknown>, message: string): void;
  warn(bindings: Record<string, unknown>, message: string): void;
}
export interface CloudTapOptions {
  redisClient?: IdempotencyGuard;
}

function buildCloudTapActionItemEvent(): ActionItemCreatedCloudEventV1 {
  return createActionItemCreatedCloudEvent(
    {
      tenantId: cloudTapTenantId,
      caseId: cloudTapCaseId,
      description: "Send the client action-item checklist",
      deadline: "2026-08-21",
      actor: "cloud-tap-advisor",
    },
    {
      idFactory: () => cloudTapActionItemEventId,
      now: () => new Date("2026-08-04T15:00:00.000Z"),
    },
  );
}

function createInMemoryActionItemRepository(): {
  insert(input: {
    caseId: string;
    description: string;
    deadline: string;
    completed: boolean;
  }): Promise<{
    id: number;
    case_id: string;
    description: string;
    deadline: string;
    completed: boolean;
  }>;
  rows: Array<{
    id: number;
    case_id: string;
    description: string;
    deadline: string;
    completed: boolean;
  }>;
} {
  const rows: Array<{
    id: number;
    case_id: string;
    description: string;
    deadline: string;
    completed: boolean;
  }> = [];

  return {
    rows,
    async insert(input) {
      const row = {
        id: rows.length + 1,
        case_id: input.caseId,
        description: input.description,
        deadline: input.deadline,
        completed: input.completed,
      };

      rows.push(row);
      return row;
    },
  };
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

export function buildCloudTapEvent(): StageChangedCloudEventV1 {
  return stageChangedCloudEventSchemaV1.parse(
    createCloudEventV1(
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

function createInMemoryTraceWriter(): {
  traceWriter: CloudTapTraceWriter;
  entries: Array<{ key: string; value: string }>;
} {
  const entries: Array<{ key: string; value: string }> = [];

  return {
    traceWriter: {
      async set(key: string, value: string): Promise<unknown> {
        entries.push({ key, value });
        return "OK";
      },
    },
    entries,
  };
}

function buildPresentToClientCloudTapCycle(stage: TaxPlanCycle["stage"]): TaxPlanCycle {
  return {
    id: cloudTapCaseId,
    client_id: cloudTapClientId,
    stage,
    owner: "Cloud Tap Advisor",
    priority: "high",
    due_date: "2026-08-02",
    on_hold: false,
  };
}

function createInMemoryTransitionRepository(
  initialCycle: TaxPlanCycle,
): {
  transition: (input: {
    tenantId: string;
    caseId: string;
    toStage: TaxPlanCycle["stage"];
    actor: string;
  }) => Promise<TaxPlanCycle | null>;
  getCurrentCycle: () => TaxPlanCycle;
  transitions: Array<{
    fromStage: TaxPlanCycle["stage"];
    toStage: TaxPlanCycle["stage"];
  }>;
} {
  let currentCycle = initialCycle;
  const transitions: Array<{
    fromStage: TaxPlanCycle["stage"];
    toStage: TaxPlanCycle["stage"];
  }> = [];

  return {
    async transition(input) {
      void input.tenantId;
      void input.caseId;
      void input.actor;
      transitions.push({
        fromStage: currentCycle.stage,
        toStage: input.toStage,
      });
      currentCycle = {
        ...currentCycle,
        stage: input.toStage,
      };

      return currentCycle;
    },
    getCurrentCycle: () => currentCycle,
    transitions,
  };
}

function serializeCloudTapTrace(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

async function writePresentToClientCloudTapTrace(
  traceWriter: CloudTapTraceWriter | undefined,
  sequence: "success" | "compensation",
  input: {
    tenantId: string;
    caseId: string;
    actor: string;
    actionItem: ActionItemCreatedEventInput;
  },
  result: PresentToClientCloudTapSequenceResult,
  stageChangedEvents: StageChangedEventPublishInput[],
): Promise<void> {
  if (!traceWriter) {
    return;
  }

  const prefix = `cloudtap:present-to-client:${sequence}`;
  const [forwardStageChangedEvent, compensatingStageChangedEvent] =
    stageChangedEvents;

  await traceWriter.set(
    `${prefix}:forward-stage-changed`,
    serializeCloudTapTrace(forwardStageChangedEvent ?? null),
  );
  await traceWriter.set(
    `${prefix}:action-item-created`,
    serializeCloudTapTrace({
      tenantId: input.tenantId,
      caseId: input.caseId,
      actor: input.actor,
      actionItem: input.actionItem,
    }),
  );

  if (compensatingStageChangedEvent) {
    await traceWriter.set(
      `${prefix}:compensating-stage-changed`,
      serializeCloudTapTrace(compensatingStageChangedEvent),
    );
  }

  await traceWriter.set(
    `${prefix}:result`,
    serializeCloudTapTrace(result),
  );
}

async function runPresentToClientCloudTapSequence(
  sequence: "success" | "compensation",
  shouldFailActionItemPublish: boolean,
  traceWriter?: CloudTapTraceWriter,
): Promise<PresentToClientCloudTapSequenceResult> {
  const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e95";
  const caseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e96";
  const actor = "cloud-tap-advisor";
  const actionItem: ActionItemCreatedEventInput = {
    description: "Send the client presentation packet",
    deadline: "2026-08-14",
  };
  const repository = createInMemoryTransitionRepository(
    buildPresentToClientCloudTapCycle("Review"),
  );
  const stageChangedEvents: StageChangedEventPublishInput[] = [];
  let actionItemStatus: "processed" | "failed" = "processed";

  const stageChangedEventPublisher = {
    publishStageChanged: async (input: StageChangedEventPublishInput): Promise<void> => {
      stageChangedEvents.push(input);
    },
  };
  const actionItemEventPublisher = {
    publishActionItemCreated: async (): Promise<void> => {
      if (shouldFailActionItemPublish) {
        actionItemStatus = "failed";
        throw new Error("action-item publish failed");
      }
    },
  };

  const transition = await repository.transition({
    tenantId,
    caseId,
    toStage: "Client Approval",
    actor,
  });

  if (!transition) {
    throw new Error("Expected the present-to-client transition to succeed.");
  }

  await stageChangedEventPublisher.publishStageChanged({
    tenantId,
    caseId,
    fromStage: "Review",
    toStage: "Client Approval",
    actor,
  });

  const saga: PresentToClientSaga = createPresentToClientSaga({
    repository,
    stageChangedEventPublisher,
    actionItemEventPublisher,
  });

  await saga.run({
    transitionedCycle: transition,
    tenantId,
    caseId,
    actor,
    actionItem,
  }).catch(() => undefined);

  const result = {
    finalStage: repository.getCurrentCycle().stage,
    actionItemStatus,
    rollbackCount: repository.transitions.filter((entry) => entry.toStage === "Review").length,
    stageChangedEvents: stageChangedEvents.length,
  };

  await writePresentToClientCloudTapTrace(
    traceWriter,
    sequence,
    {
      tenantId,
      caseId,
      actor,
      actionItem,
    },
    result,
    stageChangedEvents,
  );

  return result;
}

export async function runPresentToClientCloudTap(
  traceWriter?: CloudTapTraceWriter,
): Promise<PresentToClientCloudTapResult> {
  const success = await runPresentToClientCloudTapSequence("success", false, traceWriter);
  const compensation = await runPresentToClientCloudTapSequence(
    "compensation",
    true,
    traceWriter,
  );

  return {
    success,
    compensation,
  };
}

export async function runCloudTap(
  redisUrl: string = cloudTapRedisUrl,
  options: CloudTapOptions = {},
): Promise<CloudTapResult> {
  const event = buildCloudTapEvent();
  const actionItemEvent = buildCloudTapActionItemEvent();
  const idempotencyKey = buildIdempotencyKey({
    tenantId: event.data.tenant_id,
    consumerName: STAGE_CHANGED_CONSUMER_NAME,
    eventId: event.id,
  });
  const actionItemIdempotencyKey = buildIdempotencyKey({
    tenantId: actionItemEvent.data.tenant_id,
    consumerName: ACTION_ITEM_CREATED_CONSUMER_NAME,
    eventId: actionItemEvent.id,
    namespace: ACTION_ITEM_CREATED_IDEMPOTENCY_NAMESPACE,
  });
  const messageBody = buildCloudTapSnsNotificationEnvelope(event);
  const sqsClient = createSyntheticSqsClient(messageBody);
  const capture = createCaptureLogger();
  const projectionWrites: StageChangedCloudEventV1[] = [];
  const actionItemProjection = createInMemoryActionItemRepository();
  const redisConnection = options.redisClient
    ? undefined
    : createClient({
        url: redisUrl,
        socket: { connectTimeout: 3_000 },
      });
  const redisClient: IdempotencyGuard =
    options.redisClient ?? redisConnection ?? createClient({ url: redisUrl });
  const actionItemConsumer = createRedisActionItemConsumer(
    redisClient,
    actionItemProjection,
  );
  const idempotencyStore = createRedisIdempotencyStore(redisClient);
  const consumer = createSqsConsumer(
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
    await redisClient.set(idempotencyKey, cloudTapMockIdempotencyValue, {
      EX: 24 * 60 * 60,
    });
    const secondResult = await consumer.consumeStageChangedEventsOnce();
    const actionItemFirstResult =
      await actionItemConsumer.handleActionItemCreatedEvent(actionItemEvent);
    const actionItemSecondResult =
      await actionItemConsumer.handleActionItemCreatedEvent(actionItemEvent);
    const presentToClient = await runPresentToClientCloudTap(redisClient);

    return {
      mode: "redis",
      queueUrl: cloudTapQueueUrl,
      event,
      idempotencyKey,
      firstResult,
      secondResult,
      projectionWrites: projectionWrites.length,
      sentCommands: sqsClient.sentCommands,
      infoLogs: capture.infoLogs,
      warnLogs: capture.warnLogs,
      actionItemEvent,
      actionItemIdempotencyKey,
      actionItemFirstResult,
      actionItemSecondResult,
      actionItemProjectionWrites: actionItemProjection.rows.length,
      presentToClient,
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
  console.log(`Action item event id: ${result.actionItemEvent.id}`);
  console.log(
    `Action item delivery: ${result.actionItemFirstResult.status}/${result.actionItemSecondResult.status}`,
  );
  console.log(`Action item projection writes: ${result.actionItemProjectionWrites}`);
  console.log(
    `Present-to-client saga: success=${result.presentToClient.success.finalStage}, compensation=${result.presentToClient.compensation.finalStage}`,
  );
  console.log(
    `Saga rollback count: ${result.presentToClient.compensation.rollbackCount}`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
