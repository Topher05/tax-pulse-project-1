import type { AggregationDataSource } from "./features/deductions/deductionAggregationClient.js";
import type { ClientDeductionAggregationPayload } from "./deductionAggregation.js";

const syntheticDeductionCategories = [
  "Business Expense",
  "Home Office",
  "Charitable Giving",
  "Health & Medical",
  "Education",
  "Retirement Contribution",
  "Other",
] as const;

const syntheticDeductionDescriptions = [
  "Client lunches and travel for business development",
  "Dedicated workspace and office supplies",
  "Donations to qualified charitable organizations",
  "Premiums and out-of-pocket health costs",
  "Tuition and certification fees",
  "IRA and retirement plan contribution review",
  "Miscellaneous deductible expense follow-up",
] as const;

function buildSyntheticDeductions(totalCount: number): ClientDeductionAggregationPayload["deductions"] {
  return Array.from({ length: totalCount }, (_value, index) => {
    const category =
      syntheticDeductionCategories[index % syntheticDeductionCategories.length] ??
      "Other";
    const description =
      syntheticDeductionDescriptions[index % syntheticDeductionDescriptions.length] ??
      "Deduction item";

    return {
      id: `ded-${String(index + 1).padStart(3, "0")}`,
      date: "2026-07-30",
      description: `${description} ${index + 1}`,
      category,
      amount: 780 + index * 145,
    };
  });
}

const mockAggregationPayloads = new Map<string, ClientDeductionAggregationPayload>([
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
      deductions: buildSyntheticDeductions(25),
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
      deductions: buildSyntheticDeductions(7),
    },
  ],
]);

export class InMemoryMockAggregationDataSource implements AggregationDataSource {
  constructor(
    private readonly payloads: ReadonlyMap<string, ClientDeductionAggregationPayload> =
      mockAggregationPayloads,
  ) {}

  async fetchClientAggregationPayload(
    clientId: string,
  ): Promise<ClientDeductionAggregationPayload> {
    const payload = this.payloads.get(clientId);

    if (payload === undefined) {
      throw new Error(`No mock aggregation payload exists for client: ${clientId}`);
    }

    return structuredClone(payload);
  }
}
