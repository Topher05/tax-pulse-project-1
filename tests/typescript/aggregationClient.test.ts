import { afterEach, describe, expect, test, vi } from "vitest";

import {
  AggregationTimeoutError,
  InMemoryMockAggregationDataSource,
  TaxPulseAggregationClient,
  clientIncomeDeductionAggregationPayloadSchema,
  type AggregationDataSource,
  type ClientIncomeDeductionAggregationPayload,
} from "../../src/typescript/index.js";

describe("TaxPulseAggregationClient", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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

  test("rejects with a typed timeout error when the source does not resolve", async () => {
    vi.useFakeTimers();
    const client = new TaxPulseAggregationClient(
      {
        async fetchClientAggregationPayload() {
          return await new Promise<ClientIncomeDeductionAggregationPayload>(
            () => {},
          );
        },
      },
      { timeoutMs: 25 },
    );

    const payloadPromise = client.fetchAggregationPayload("client-timeout");
    const rejectionExpectation = expect(payloadPromise).rejects.toMatchObject({
      clientId: "client-timeout",
      timeoutMs: 25,
    });

    await vi.advanceTimersByTimeAsync(25);
    await rejectionExpectation;

    const error = await payloadPromise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AggregationTimeoutError);
  });

  test("resolves a fast source before the configured timeout elapses", async () => {
    vi.useFakeTimers();
    const fastPayload: ClientIncomeDeductionAggregationPayload = {
      clientId: "client-fast",
      incomeEvents: [
        {
          source: "Synthetic salary",
          amount: 96000,
          withholding: 18000,
        },
      ],
      deductions: [
        {
          category: "Synthetic retirement contribution",
          amount: 6000,
        },
      ],
    };
    const fastSource: AggregationDataSource = {
      async fetchClientAggregationPayload() {
        return fastPayload;
      },
    };
    const client = new TaxPulseAggregationClient(fastSource, { timeoutMs: 25 });

    const payload = await client.fetchAggregationPayload("client-fast");

    expect(
      clientIncomeDeductionAggregationPayloadSchema.parse(payload),
    ).toStrictEqual(payload);
    expect(payload).toStrictEqual(fastPayload);
  });
});
