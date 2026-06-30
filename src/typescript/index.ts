import { fileURLToPath } from "node:url";

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

export {
  isLegalTaxPlanCycleStageTransition,
  taxPlanCycleCreateSchema,
  taxPlanCyclePrioritySchema,
  taxPlanCycleSchema,
  taxPlanCycleStageSchema,
  taxPlanCycleStages,
  type TaxPlanCycle,
  type TaxPlanCycleCreateInput,
  type TaxPlanCyclePriority,
  type TaxPlanCycleStage,
} from "./taxPlanCycle.js";
export {
  taxPlanCycleCreateController,
  type TaxPlanCycleCreateController,
  type TaxPlanCycleCreateResult,
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

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(createGreeting());
}
