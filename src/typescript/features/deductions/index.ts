export {
  clientDeductionAggregationPayloadSchema,
  deductionReadParamsSchema,
  deductionCategorySchema,
  deductionCategoryValues,
  deductionSchema,
  incomeEventSchema,
  type DeductionCategory,
  type ClientDeductionAggregationPayload,
  type Deduction,
  type IncomeEvent,
} from "./repositories/deduction.js";
export {
  AggregationTimeoutError,
  TaxPulseAggregationClient,
  type AggregationDataSource,
  type TaxPulseAggregationClientOptions,
} from "./infrastructure/aggregationClient.js";
export { InMemoryMockAggregationDataSource } from "./repositories/mockAggregationDataSource.js";
export {
  createDeductionController,
  type DeductionController,
  type DeductionControllerOptions,
} from "./controllers/deductions.js";
export {
  createDeductionsRouter,
  type CreateDeductionsRouterOptions,
} from "./routes.js";
