import { Client } from "pg";
import { createClient } from "redis";
import { createLogger } from "../../logger.js";
import { getJwtConfigFromEnv } from "../../authConfig.js";
import { createAuditEntryWriter } from "../../auditEntryRepository.js";
import {
  createNoopTaxPlanCycleQueueCacheInvalidator,
  createTaxPlanCycleQueueCache,
  createTaxPlanCycleQueueCacheInvalidator,
} from "./infrastructure/queueCache.js";
import { createTaxPlanCycleRepository } from "./repositories/repository.js";
import { createTaxPlanCycleTransitionController } from "./controllers/transitionController.js";
import {
  createActionItemCreatedSnsClient,
  createSnsActionItemCreatedEventPublisher,
  getActionItemCreatedTopicArnFromEnv,
} from "./infrastructure/cloudEvents/actionItemCreated/index.js";
import {
  createJwtLambdaAuthenticator,
  createExecuteLambdaHandler,
  createPresentToClientLambdaHandler,
  type LambdaHttpRequest,
  type LambdaHttpResponse,
} from "./lambdaHandlers.js";
import {
  createSnsStageChangedEventPublisher,
  createStageChangedSnsClient,
  getStageChangedTopicArnFromEnv,
} from "./infrastructure/cloudEvents/stageChanged/index.js";

export interface TaxPlanCycleLambdaRuntime {
  presentToClientHandler(event: LambdaHttpRequest): Promise<LambdaHttpResponse>;
  executeHandler(event: LambdaHttpRequest): Promise<LambdaHttpResponse>;
}

let runtimePromise: Promise<TaxPlanCycleLambdaRuntime> | undefined;

async function createRuntime(
  env: NodeJS.ProcessEnv = process.env,
): Promise<TaxPlanCycleLambdaRuntime> {
  const logger = createLogger();
  const databaseUrl = env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the Tax Plan Cycle Lambda runtime.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const repository = createTaxPlanCycleRepository(client);
  const auditEntryWriter = createAuditEntryWriter(client);
  const jwtAuthenticator = createJwtLambdaAuthenticator(getJwtConfigFromEnv(env));
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
  const actionItemEventPublisher = createSnsActionItemCreatedEventPublisher(
    createActionItemCreatedSnsClient(env),
    getActionItemCreatedTopicArnFromEnv(env),
  );
  const controller = createTaxPlanCycleTransitionController(repository, {
    queueCacheInvalidator,
    stageChangedEventPublisher,
    actionItemEventPublisher,
  });

  return {
    presentToClientHandler: createPresentToClientLambdaHandler({
      controller,
      auditEntryWriter,
      authenticator: jwtAuthenticator,
    }),
    executeHandler: createExecuteLambdaHandler({
      controller,
      auditEntryWriter,
      authenticator: jwtAuthenticator,
    }),
  };
}

async function getRuntime(
  env: NodeJS.ProcessEnv = process.env,
): Promise<TaxPlanCycleLambdaRuntime> {
  runtimePromise ??= createRuntime(env);
  return await runtimePromise;
}

export async function presentToClientHandler(
  event: LambdaHttpRequest,
): Promise<LambdaHttpResponse> {
  const runtime = await getRuntime();
  return await runtime.presentToClientHandler(event);
}

export async function executeHandler(
  event: LambdaHttpRequest,
): Promise<LambdaHttpResponse> {
  const runtime = await getRuntime();
  return await runtime.executeHandler(event);
}

export async function resetTaxPlanCycleLambdaRuntimeForTests(): Promise<void> {
  runtimePromise = undefined;
}
