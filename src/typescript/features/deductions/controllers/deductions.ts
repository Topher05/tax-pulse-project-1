import type { TaxPulseAggregationClient } from "../deductionAggregationClient.js";
import type { ClientDeductionAggregationPayload } from "../deductionAggregation.js";

export interface DeductionController {
  read(input: { clientId: string }): Promise<ClientDeductionAggregationPayload>;
}

export interface DeductionControllerOptions {
  aggregationClient: TaxPulseAggregationClient;
}

export function createDeductionController(
  options: DeductionControllerOptions,
): DeductionController {
  return {
    async read(input) {
      return await options.aggregationClient.fetchAggregationPayload(input.clientId);
    },
  };
}
