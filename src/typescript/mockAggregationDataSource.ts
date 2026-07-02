import type { AggregationDataSource } from "./aggregationClient.js";
import type { ClientIncomeDeductionAggregationPayload } from "./aggregationPayload.js";

const mockAggregationPayloads = new Map<string, ClientIncomeDeductionAggregationPayload>([
  [
    "client-123",
    {
      clientId: "client-123",
      incomeEvents: [
        {
          source: "W-2 wages",
          amount: 125000,
          withholding: 24500,
        },
        {
          source: "1099 interest",
          amount: 1400,
          withholding: 0,
        },
      ],
      deductions: [
        {
          category: "Mortgage interest",
          amount: 18500,
        },
      ],
    },
  ],
  [
    "client-456",
    {
      clientId: "client-456",
      incomeEvents: [
        {
          source: "K-1 partnership income",
          amount: 82000,
          withholding: 0,
        },
      ],
      deductions: [
        {
          category: "Charitable contributions",
          amount: 9100,
        },
        {
          category: "State tax estimate",
          amount: 7800,
        },
      ],
    },
  ],
]);

export class InMemoryMockAggregationDataSource implements AggregationDataSource {
  constructor(
    private readonly payloads: ReadonlyMap<string, ClientIncomeDeductionAggregationPayload> =
      mockAggregationPayloads,
  ) {}

  async fetchClientAggregationPayload(
    clientId: string,
  ): Promise<ClientIncomeDeductionAggregationPayload> {
    const payload = this.payloads.get(clientId);

    if (payload === undefined) {
      throw new Error(`No mock aggregation payload exists for client: ${clientId}`);
    }

    return structuredClone(payload);
  }
}
