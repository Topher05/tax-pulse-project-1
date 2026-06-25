import assert from "node:assert/strict";
import test from "node:test";

import {
  clientIncomeDeductionAggregationPayloadSchema,
  createGreeting,
  type ClientIncomeDeductionAggregationPayload,
} from "../../src/typescript/index.js";

test("createGreeting returns the TypeScript smoke message", () => {
  assert.equal(createGreeting(), "hello from TypeScript");
});

test("client income and deduction aggregation payload validates", () => {
  const payload: ClientIncomeDeductionAggregationPayload = {
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
  };

  assert.deepEqual(
    clientIncomeDeductionAggregationPayloadSchema.parse(payload),
    payload,
  );
});

test("client income and deduction aggregation payload rejects negative money amounts", () => {
  const payload: ClientIncomeDeductionAggregationPayload = {
    clientId: "client-123",
    incomeEvents: [
      {
        source: "W-2 wages",
        amount: 125000,
        withholding: 24500,
      },
    ],
    deductions: [
      {
        category: "Mortgage interest",
        amount: 18500,
      },
    ],
  };

  const negativeAmountPayloads = [
    {
      ...payload,
      incomeEvents: [{ ...payload.incomeEvents[0], amount: -1 }],
    },
    {
      ...payload,
      incomeEvents: [{ ...payload.incomeEvents[0], withholding: -1 }],
    },
    {
      ...payload,
      deductions: [{ ...payload.deductions[0], amount: -1 }],
    },
  ];

  for (const invalidPayload of negativeAmountPayloads) {
    assert.equal(
      clientIncomeDeductionAggregationPayloadSchema.safeParse(invalidPayload)
        .success,
      false,
    );
  }
});
