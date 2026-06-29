import type { ClientIncomeDeductionAggregationPayload } from "./aggregationPayload.js";

export interface AggregationDataSource {
  fetchClientAggregationPayload(
    clientId: string,
  ): Promise<ClientIncomeDeductionAggregationPayload>;
}

export class TaxPulseAggregationClient {
  constructor(private readonly dataSource: AggregationDataSource) {}

  async fetchAggregationPayload(
    clientId: string,
  ): Promise<ClientIncomeDeductionAggregationPayload> {
    return await this.dataSource.fetchClientAggregationPayload(clientId);
  }
}
