import type { AuditEntryWriter } from "../../../auditEntryRepository.js";
import {
  createTaxPlanCycleTransitionController,
} from "../../../features/taxPlanCycle/controllers/transitionController.js";
import type {
  SnsClient as StageChangedSnsClient,
} from "../../../features/taxPlanCycle/infrastructure/cloudEvents/stageChanged/index.js";
import {
  createSnsStageChangedEventPublisher,
  createStageChangedSnsClient,
  getStageChangedTopicArnFromEnv,
} from "../../../features/taxPlanCycle/infrastructure/cloudEvents/stageChanged/index.js";
import {
  createExecuteLambdaHandler,
  type ExecuteLambdaRequest,
  type ExecuteLambdaResponse,
} from "./index.js";
import {
  createMutableTaxPlanCycleRepository,
  createNoopAuditEntryWriter,
} from "../taxPlanCycleLambdaRuntime.js";
import type { TaxPlanCycleRepository } from "../../../features/taxPlanCycle/repositories/repository.js";

export interface ExecuteLambdaRuntime {
  handler(event: ExecuteLambdaRequest): Promise<ExecuteLambdaResponse>;
}

export interface ExecuteLambdaRuntimeOptions {
  env?: NodeJS.ProcessEnv;
  repository?: TaxPlanCycleRepository;
  auditEntryWriter?: AuditEntryWriter;
  stageChangedSnsClient?: StageChangedSnsClient;
}

let runtimePromise: Promise<ExecuteLambdaRuntime> | undefined;

export async function createExecuteLambdaRuntime(
  options: ExecuteLambdaRuntimeOptions = {},
): Promise<ExecuteLambdaRuntime> {
  const env = options.env ?? process.env;
  const repository =
    options.repository ?? createMutableTaxPlanCycleRepository("Client Approval");
  const auditEntryWriter = options.auditEntryWriter ?? createNoopAuditEntryWriter();
  const stageChangedSnsClient =
    options.stageChangedSnsClient ?? createStageChangedSnsClient(env);
  const stageChangedEventPublisher = createSnsStageChangedEventPublisher(
    stageChangedSnsClient,
    getStageChangedTopicArnFromEnv(env),
  );
  const controller = createTaxPlanCycleTransitionController(repository, {
    stageChangedEventPublisher,
  });

  return {
    handler: createExecuteLambdaHandler({
      controller,
      auditEntryWriter,
    }),
  };
}

async function getRuntime(): Promise<ExecuteLambdaRuntime> {
  runtimePromise ??= createExecuteLambdaRuntime();
  return await runtimePromise;
}

export async function executeHandler(event: ExecuteLambdaRequest): Promise<ExecuteLambdaResponse> {
  const runtime = await getRuntime();
  return await runtime.handler(event);
}

export async function resetExecuteLambdaRuntimeForTests(): Promise<void> {
  runtimePromise = undefined;
}
