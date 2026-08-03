import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { createClient } from "redis";

import {
  STAGE_CHANGED_CONSUMER_NAME,
  buildIdempotencyKey,
  createRedisConsumer,
  createStageChangedCloudEvent,
  stageChangedCloudEventSchemaV1,
  type IdempotencyGuard,
  type StageChangedCloudEventV1,
  type TaxPlanCycle,
} from "../../features/taxPlanCycle/index.js";

loadEnv();

const cloudTapTenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91";
const cloudTapCaseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e92";
const cloudTapClientId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e93";
const cloudTapEventId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e94";

export interface CloudTapResult {
  mode: "memory" | "redis";
  event: StageChangedCloudEventV1;
  idempotencyKey: string;
  firstStatus: "processed" | "duplicate";
  secondStatus: "processed" | "duplicate";
  projectionWrites: number;
}

export interface CloudTapLogger {
  log(message: string): void;
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
    createStageChangedCloudEvent(
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

function buildCloudTapCycle(): TaxPlanCycle {
  return {
    id: cloudTapCaseId,
    client_id: cloudTapClientId,
    stage: "Review",
    owner: "Cloud Tap Advisor",
    priority: "high",
    due_date: "2026-08-02",
    on_hold: false,
  };
}

export async function runCloudTap(
  redisUrl: string | undefined = process.env.TAXPULSE_REDIS_URL?.trim(),
): Promise<CloudTapResult> {
  const event = buildCloudTapEvent();
  const repository = {
    findByCaseId: async (): Promise<TaxPlanCycle | null> => buildCloudTapCycle(),
  };
  const projectionWrites: Array<unknown> = [];
  const writer = {
    upsert: async (item: unknown): Promise<void> => {
      projectionWrites.push(item);
    },
  };
  const memoryRedisClient = createInMemoryRedisClient();
  const redisConnection = redisUrl ? createClient({ url: redisUrl }) : undefined;
  const redisClient: IdempotencyGuard = redisConnection ?? memoryRedisClient;

  if (redisConnection) {
    await redisConnection.connect();
  }

  try {
    const consumer = createRedisConsumer(redisClient, repository, writer);
    const first = await consumer.handleStageChangedEvent(event);
    const second = await consumer.handleStageChangedEvent(event);

    return {
      mode: redisUrl ? "redis" : "memory",
      event,
      idempotencyKey: buildIdempotencyKey({
        tenantId: event.data.tenant_id,
        consumerName: STAGE_CHANGED_CONSUMER_NAME,
        eventId: event.id,
      }),
      firstStatus: first.status,
      secondStatus: second.status,
      projectionWrites: projectionWrites.length,
    };
  } finally {
    if (redisConnection) {
      await redisConnection.quit().catch(() => undefined);
    }
  }
}

export async function main(): Promise<void> {
  const redisUrl = process.env.TAXPULSE_REDIS_URL?.trim();
  const result = await runCloudTap(redisUrl);

  console.log(`Cloud tap mode: ${result.mode}`);
  console.log(`Consumer: ${STAGE_CHANGED_CONSUMER_NAME}`);
  console.log(`Idempotency key: ${result.idempotencyKey}`);
  console.log(`First delivery: ${result.firstStatus}`);
  console.log(`Second delivery: ${result.secondStatus}`);
  console.log(`Projection writes: ${result.projectionWrites}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
