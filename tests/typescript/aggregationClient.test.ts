import { describe, expect, test } from "vitest";

import {
  InMemoryMockAggregationDataSource,
  TaxPulseAggregationClient,
  clientIncomeDeductionAggregationPayloadSchema,
} from "../../src/typescript/index.js";

describe("TaxPulseAggregationClient", () => {
  test("fetches a typed aggregation payload from the in-memory mock source", async () => {
    const client = new TaxPulseAggregationClient(
      new InMemoryMockAggregationDataSource(),
    );

    const payload = await client.fetchAggregationPayload("client-123");

    expect(
      clientIncomeDeductionAggregationPayloadSchema.parse(payload),
    ).toStrictEqual(payload);
    expect(payload).toMatchObject({
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
    });
  });

  test("resolves concurrent aggregation calls for two clients independently", async () => {
    const dataSource = new InMemoryMockAggregationDataSource();
    const firstClient = new TaxPulseAggregationClient(dataSource);
    const secondClient = new TaxPulseAggregationClient(dataSource);

    const [firstPayload, secondPayload] = await Promise.all([
      firstClient.fetchAggregationPayload("client-123"),
      secondClient.fetchAggregationPayload("client-456"),
    ]);

    expect(
      clientIncomeDeductionAggregationPayloadSchema.parse(firstPayload),
    ).toStrictEqual(firstPayload);
    expect(
      clientIncomeDeductionAggregationPayloadSchema.parse(secondPayload),
    ).toStrictEqual(secondPayload);
    expect(firstPayload.clientId).toBe("client-123");
    expect(secondPayload.clientId).toBe("client-456");
    expect(firstPayload).not.toBe(secondPayload);
  });
});
