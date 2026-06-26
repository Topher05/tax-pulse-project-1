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
  isLegalTaxPlanCycleStageTransition,
  taxPlanCyclePrioritySchema,
  taxPlanCycleSchema,
  taxPlanCycleStageSchema,
  taxPlanCycleStages,
  type TaxPlanCycle,
  type TaxPlanCyclePriority,
  type TaxPlanCycleStage,
} from "./taxPlanCycle.js";

export function createGreeting(runtime: string = "TypeScript"): string {
  return `hello from ${runtime}`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(createGreeting());
}
