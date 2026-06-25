import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  clientIncomeDeductionAggregationPayloadSchema,
  createGreeting,
  taxPlanCycleStages,
  type ClientIncomeDeductionAggregationPayload,
  type TaxPlanCycleStage,
} from "../../src/typescript/index.js";

test("createGreeting returns the TypeScript smoke message", () => {
  assert.equal(createGreeting(), "hello from TypeScript");
});

test("tax plan cycle stages are listed in canonical order", () => {
  assert.deepEqual(taxPlanCycleStages, [
    "Intake",
    "Data Aggregation",
    "Modeling",
    "Review",
    "Client Approval",
    "Executed",
    "Archived",
  ]);
});

const validStage: TaxPlanCycleStage = "Review";

test("tax plan cycle stage type accepts known stages", () => {
  assert.equal(validStage, "Review");
});

// @ts-expect-error unknown stage strings are not assignable
const invalidStage: TaxPlanCycleStage = "Unknown";
void invalidStage;

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
