export {
  clientDeductionAggregationPayloadSchema,
  deductionReadParamsSchema,
  deductionCategorySchema,
  deductionCategoryValues,
  deductionSchema,
  deductionTableRowSchema,
  deductionTableRowsSchema,
  incomeEventSchema,
  type DeductionCategory,
  type ClientDeductionAggregationPayload,
  type Deduction,
  type DeductionTableRow,
  type DeductionTableRows,
  type IncomeEvent,
} from "./repositories/deduction.js";
export {
  AggregationTimeoutError,
  TaxPulseAggregationClient,
  type AggregationDataSource,
  type TaxPulseAggregationClientOptions,
} from "./infrastructure/aggregationClient.js";
export {
  createDeductionRepository,
  type DeductionListInput,
  type DeductionRepository,
} from "./repositories/repository.js";
export {
  createDeductionsRouter,
  type CreateDeductionsRouterOptions,
} from "./routes.js";
