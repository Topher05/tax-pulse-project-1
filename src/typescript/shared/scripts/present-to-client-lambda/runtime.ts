import type { AuditEntryWriter } from "../../../features/audit/persistence/auditEntryRepository.js";
import {
  createTaxPlanCycleTransitionController,
} from "../../../features/taxPlanCycle/controllers/transitionController.js";
import type {
  ActionItemCreatedSnsClient,
} from "../../../features/taxPlanCycle/infrastructure/cloudEvents/actionItemCreated/index.js";
import type {
  SnsClient as StageChangedSnsClient,
} from "../../../features/taxPlanCycle/infrastructure/cloudEvents/stageChanged/index.js";
import {
  createActionItemCreatedSnsClient,
  createSnsActionItemCreatedEventPublisher,
  getActionItemCreatedTopicArnFromEnv,
} from "../../../features/taxPlanCycle/infrastructure/cloudEvents/actionItemCreated/index.js";
import {
  createSnsStageChangedEventPublisher,
  createStageChangedSnsClient,
  getStageChangedTopicArnFromEnv,
} from "../../../features/taxPlanCycle/infrastructure/cloudEvents/stageChanged/index.js";
import {
  createPresentToClientLambdaHandler,
  type PresentToClientLambdaRequest,
  type PresentToClientLambdaResponse,
} from "./index.js";
import { createLogger } from "../../cloud-logger/logger.js";
import {
  createMutableTaxPlanCycleRepository,
  createNoopAuditEntryWriter,
} from "../taxPlanCycleLambdaRuntime.js";
import type { TaxPlanCycleRepository } from "../../../features/taxPlanCycle/repositories/repository.js";

export interface PresentToClientLambdaRuntime {
  handler(event: PresentToClientLambdaRequest): Promise<PresentToClientLambdaResponse>;
}

export interface PresentToClientLambdaRuntimeOptions {
  env?: NodeJS.ProcessEnv;
  repository?: TaxPlanCycleRepository;
  auditEntryWriter?: AuditEntryWriter;
  stageChangedSnsClient?: StageChangedSnsClient;
  actionItemCreatedSnsClient?: ActionItemCreatedSnsClient;
}

let runtimePromise: Promise<PresentToClientLambdaRuntime> | undefined;

export async function createPresentToClientLambdaRuntime(
  options: PresentToClientLambdaRuntimeOptions = {},
): Promise<PresentToClientLambdaRuntime> {
  const env = options.env ?? process.env;
  const logger = createLogger();
  const repository =
    options.repository ?? createMutableTaxPlanCycleRepository("Review");
  const auditEntryWriter = options.auditEntryWriter ?? createNoopAuditEntryWriter();
  const stageChangedSnsClient =
    options.stageChangedSnsClient ?? createStageChangedSnsClient(env);
  const actionItemCreatedSnsClient =
    options.actionItemCreatedSnsClient ?? createActionItemCreatedSnsClient(env);
  const stageChangedEventPublisher = createSnsStageChangedEventPublisher(
    stageChangedSnsClient,
    getStageChangedTopicArnFromEnv(env),
  );
  const actionItemEventPublisher = createSnsActionItemCreatedEventPublisher(
    actionItemCreatedSnsClient,
    getActionItemCreatedTopicArnFromEnv(env),
  );
  const controller = createTaxPlanCycleTransitionController(repository, {
    stageChangedEventPublisher,
    actionItemEventPublisher,
    telemetryLogger: logger,
  });

  return {
    handler: createPresentToClientLambdaHandler({
      controller,
      auditEntryWriter,
      telemetryLogger: logger,
    }),
  };
}

async function getRuntime(): Promise<PresentToClientLambdaRuntime> {
  runtimePromise ??= createPresentToClientLambdaRuntime();
  return await runtimePromise;
}

export async function presentToClientHandler(
  event: PresentToClientLambdaRequest,
): Promise<PresentToClientLambdaResponse> {
  const logger = createLogger();
  logger.info({
    message: "present-to-client lambda entrypoint invoked",
    path_parameters: event.pathParameters,
    has_body: Boolean(event.body && event.body.trim().length > 0),
  });

  const runtime = await getRuntime();
  return await runtime.handler(event);
}

export async function resetPresentToClientLambdaRuntimeForTests(): Promise<void> {
  runtimePromise = undefined;
}
