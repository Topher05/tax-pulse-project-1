import { afterEach, describe, expect, test, vi } from "vitest";

import {
  AggregationTimeoutError,
  TaxPulseAggregationClient,
  clientDeductionAggregationPayloadSchema,
  type AggregationDataSource,
  type ClientDeductionAggregationPayload,
} from "../../src/typescript/index.js";

const deductionCategories = [
  "Business Expense",
  "Home Office",
  "Charitable Giving",
  "Health & Medical",
  "Education",
  "Retirement Contribution",
  "Other",
] as const;

function buildSyntheticDeductions(
  totalCount: number,
): ClientDeductionAggregationPayload["deductions"] {
  return Array.from({ length: totalCount }, (_value, index) => ({
    id: `ded-${String(index + 1).padStart(3, "0")}`,
    date: "2026-07-30",
    description: `Client lunches and travel for business development ${index + 1}`,
    category: deductionCategories[index % deductionCategories.length] ?? "Other",
    amount: 780 + index * 145,
  }));
}

function buildAggregationPayload(
  caseId: string,
  deductionCount: number,
): ClientDeductionAggregationPayload {
  return {
    caseId,
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
    deductions: buildSyntheticDeductions(deductionCount),
  };
}

describe("TaxPulseAggregationClient", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("fetches a typed aggregation payload from the inline test source", async () => {
    const client = new TaxPulseAggregationClient({
      async fetchCaseAggregationPayload(caseId) {
        return buildAggregationPayload(caseId, 25);
      },
    });

    const payload = await client.fetchAggregationPayload("018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22");

    expect(
      clientDeductionAggregationPayloadSchema.parse(payload),
    ).toStrictEqual(payload);
    expect(payload).toMatchObject({
      caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22",
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
    });
    expect(payload.deductions).toHaveLength(25);
    expect(payload.deductions[0]).toMatchObject({
      id: "ded-001",
      date: "2026-07-30",
      description: "Client lunches and travel for business development 1",
      category: "Business Expense",
      amount: 780,
    });
  });

  test("resolves concurrent aggregation calls for two clients independently", async () => {
    const dataSource: AggregationDataSource = {
      async fetchCaseAggregationPayload(caseId) {
        return buildAggregationPayload(caseId, 25);
      },
    };
    const firstClient = new TaxPulseAggregationClient(dataSource);
    const secondClient = new TaxPulseAggregationClient(dataSource);

    const [firstPayload, secondPayload] = await Promise.all([
      firstClient.fetchAggregationPayload("018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22"),
      secondClient.fetchAggregationPayload("018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d23"),
    ]);

    expect(
      clientDeductionAggregationPayloadSchema.parse(firstPayload),
    ).toStrictEqual(firstPayload);
    expect(
      clientDeductionAggregationPayloadSchema.parse(secondPayload),
    ).toStrictEqual(secondPayload);
    expect(firstPayload.caseId).toBe("018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22");
    expect(secondPayload.caseId).toBe("018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d23");
    expect(firstPayload).not.toBe(secondPayload);
  });

  test("rejects with a typed timeout error when the source does not resolve", async () => {
    vi.useFakeTimers();
    const client = new TaxPulseAggregationClient(
      {
        async fetchCaseAggregationPayload() {
          return await new Promise<ClientDeductionAggregationPayload>(
            () => {},
          );
        },
      },
      { timeoutMs: 25 },
    );

    const payloadPromise = client.fetchAggregationPayload("018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d24");
    const rejectionExpectation = expect(payloadPromise).rejects.toMatchObject({
      caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d24",
      timeoutMs: 25,
    });

    await vi.advanceTimersByTimeAsync(25);
    await rejectionExpectation;

    const error = await payloadPromise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AggregationTimeoutError);
  });

  test("resolves a fast source before the configured timeout elapses", async () => {
    vi.useFakeTimers();
    const fastPayload: ClientDeductionAggregationPayload = {
      caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d25",
      incomeEvents: [
        {
          source: "Synthetic salary",
          amount: 96000,
          withholding: 18000,
        },
      ],
      deductions: [
        {
          id: "ded-fast-001",
          date: "2026-07-30",
          description: "Synthetic retirement contribution",
          category: "Retirement Contribution",
          amount: 6000,
        },
      ],
    };
    const fastSource: AggregationDataSource = {
      async fetchCaseAggregationPayload() {
        return fastPayload;
      },
    };
    const client = new TaxPulseAggregationClient(fastSource, { timeoutMs: 25 });

    const payload = await client.fetchAggregationPayload("018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d25");

    expect(
      clientDeductionAggregationPayloadSchema.parse(payload),
    ).toStrictEqual(payload);
    expect(payload).toStrictEqual(fastPayload);
  });
});
