export {
  clientDeductionAggregationPayloadSchema,
  deductionReadParamsSchema,
  deductionSchema,
  incomeEventSchema,
  type ClientDeductionAggregationPayload,
  type Deduction,
  type IncomeEvent,
} from "./deductionAggregation.js";
export {
  AggregationTimeoutError,
  TaxPulseAggregationClient,
  type AggregationDataSource,
  type TaxPulseAggregationClientOptions,
} from "./deductionAggregationClient.js";
export { InMemoryMockAggregationDataSource } from "./mockAggregationDataSource.js";
export {
  createDeductionController,
  type DeductionController,
  type DeductionControllerOptions,
} from "./controllers/deductions.js";
export {
  createDeductionsRouter,
  type CreateDeductionsRouterOptions,
} from "./routes.js";
