import { fileURLToPath } from "node:url";
import type { Server } from "node:http";

export {
  clientIncomeDeductionAggregationPayloadSchema,
  deductionSchema,
  incomeEventSchema,
  type ClientIncomeDeductionAggregationPayload,
  type Deduction,
  type IncomeEvent,
} from "./aggregationPayload.js";
export {
  TaxPulseAggregationClient,
  type AggregationDataSource,
} from "./aggregationClient.js";
export { InMemoryMockAggregationDataSource } from "./mockAggregationDataSource.js";
export { createApp, type CreateAppOptions } from "./app.js";
export {
  ProblemHttpError,
  problemDetailsMiddleware,
  type ProblemDetails,
  type ProblemHttpErrorOptions,
} from "./errors.js";
export {
  createLogger,
  createRequestLogger,
  type CreateLoggerOptions,
} from "./logger.js";

export {
  isLegalTaxPlanCycleStageTransition,
  taxPlanCycleCreateSchema,
  taxPlanCyclePrioritySchema,
  taxPlanCycleReadParamsSchema,
  taxPlanCycleSchema,
  taxPlanCycleStageSchema,
  taxPlanCycleStages,
  type TaxPlanCycle,
  type TaxPlanCycleCreateInput,
  type TaxPlanCyclePriority,
  type TaxPlanCycleReadParams,
  type TaxPlanCycleStage,
} from "./taxPlanCycle.js";

import { createApp } from "./app.js";
import { createLogger } from "./logger.js";
import { createTaxPlanCycleRouter } from "./taxPlanCycleRoutes.js";

export {
  taxPlanCycleCreateController,
  type TaxPlanCycleCreateController,
  type TaxPlanCycleCreateResult,
  type TaxPlanCycleReadInput,
} from "./taxPlanCycleCreateController.js";
export {
  createTaxPlanCycleRouter,
  type CreateTaxPlanCycleRouterOptions,
  type ValidationErrorIssue,
  type ValidationErrorResponse,
} from "./taxPlanCycleRoutes.js";

export function createGreeting(runtime: string = "TypeScript"): string {
  return `hello from ${runtime}`;
}

export function getPortFromEnv(env: NodeJS.ProcessEnv = process.env): number {
  const rawPort = env.PORT?.trim();

  if (!rawPort) {
    return 3000;
  }

  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("PORT must be an integer between 0 and 65535.");
  }

  return port;
}

export async function main(): Promise<Server> {
  const logger = createLogger();
  const app = createApp({
    logger,
    registerRoutes: (app) => {
      app.use(createTaxPlanCycleRouter());
    },
  });
  const port = getPortFromEnv();

  return await new Promise<Server>((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info({ port }, "Core Case Service listening");
      resolve(server);
    });

    server.on("error", reject);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    const logger = createLogger();

    logger.fatal(
      { err: error },
      "Core Case Service failed to start",
    );
    process.exitCode = 1;
  });
}
