import type { TaxPulseAggregationClient } from "../infrastructure/aggregationClient.js";
import type { ClientDeductionAggregationPayload } from "../repositories/deduction.js";

export interface DeductionController {
  read(input: { caseId: string }): Promise<ClientDeductionAggregationPayload>;
}

export interface DeductionControllerOptions {
  aggregationClient: TaxPulseAggregationClient;
}

export function createDeductionController(
  options: DeductionControllerOptions,
): DeductionController {
  return {
    async read(input) {
      return await options.aggregationClient.fetchAggregationPayload(input.caseId);
    },
  };
}
