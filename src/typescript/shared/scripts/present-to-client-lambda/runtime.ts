import { Client } from "pg";
import { createClient } from "redis";

import { createAuditEntryWriter } from "../../../auditEntryRepository.js";
import { createLogger } from "../../../logger.js";
import { createTaxPlanCycleRepository } from "../../../features/taxPlanCycle/repositories/repository.js";
import { createTaxPlanCycleTransitionController } from "../../../features/taxPlanCycle/controllers/transitionController.js";
import {
  createSnsStageChangedEventPublisher,
  createStageChangedSnsClient,
  getStageChangedTopicArnFromEnv,
} from "../../../features/taxPlanCycle/infrastructure/CloudEvents/stageChanged/index.js";
import {
  createNoopTaxPlanCycleQueueCacheInvalidator,
  createTaxPlanCycleQueueCache,
  createTaxPlanCycleQueueCacheInvalidator,
} from "../../../features/taxPlanCycle/infrastructure/queueCache.js";
import {
  createPresentToClientLambdaHandler,
  type PresentToClientLambdaRequest,
  type PresentToClientLambdaResponse,
} from "./index.js";

export interface PresentToClientLambdaRuntime {
  handler(event: PresentToClientLambdaRequest): Promise<PresentToClientLambdaResponse>;
}

let runtimePromise: Promise<PresentToClientLambdaRuntime> | undefined;

async function createRuntime(
  env: NodeJS.ProcessEnv = process.env,
): Promise<PresentToClientLambdaRuntime> {
  // AWS composition root for SCRUM-160: keep the Lambda-only wiring here so
  // the feature logic stays reusable for local development and tests.
  const logger = createLogger();
  const databaseUrl = env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the Present-to-Client Lambda runtime.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const repository = createTaxPlanCycleRepository(client);
  const auditEntryWriter = createAuditEntryWriter(client);
  const queueRedisUrl = env.TAXPULSE_REDIS_URL?.trim();
  let queueCacheInvalidator = createNoopTaxPlanCycleQueueCacheInvalidator();

  if (queueRedisUrl) {
    const redisClient = createClient({ url: queueRedisUrl });
    await redisClient.connect();
    queueCacheInvalidator = createTaxPlanCycleQueueCacheInvalidator(
      createTaxPlanCycleQueueCache(redisClient),
    );
    logger.info("Connected to Redis for queue cache invalidation");
  }

  const stageChangedEventPublisher = createSnsStageChangedEventPublisher(
    createStageChangedSnsClient(env),
    getStageChangedTopicArnFromEnv(env),
  );
  const controller = createTaxPlanCycleTransitionController(repository, {
    queueCacheInvalidator,
    stageChangedEventPublisher,
  });

  return {
    handler: createPresentToClientLambdaHandler({
      controller,
      auditEntryWriter,
    }),
  };
}

async function getRuntime(
  env: NodeJS.ProcessEnv = process.env,
): Promise<PresentToClientLambdaRuntime> {
  runtimePromise ??= createRuntime(env);
  return await runtimePromise;
}

export async function presentToClientHandler(
  event: PresentToClientLambdaRequest,
): Promise<PresentToClientLambdaResponse> {
  const runtime = await getRuntime();
  return await runtime.handler(event);
}

export async function resetPresentToClientLambdaRuntimeForTests(): Promise<void> {
  runtimePromise = undefined;
}
