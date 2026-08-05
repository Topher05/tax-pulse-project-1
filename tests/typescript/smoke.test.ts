import { strict as assert } from "node:assert";
import { test } from "node:test";
import { z } from "zod";

import {
  createGreeting,
  clientDeductionAggregationPayloadSchema,
  deductionCategoryValues,
  taxPlanCycleSchema,
  taxPlanCycleStages,
  type ClientDeductionAggregationPayload,
  type TaxPlanCycle,
  type TaxPlanCycleStage,
} from "../../src/typescript/index.js";

const SMOKE_GREETING = "hello from TypeScript";

function reportSmokeCheck(name: string, check: () => void): void {
  try {
    check();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("createGreeting returns the TypeScript smoke message", () => {
  reportSmokeCheck("createGreeting returns the TypeScript smoke message", () => {
    assert.equal(createGreeting(), SMOKE_GREETING);
  });
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

const validTaxPlanCycle: TaxPlanCycle = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
  client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
  stage: "Review",
  owner: "advisor-123",
  priority: "high",
  due_date: "2026-12-31",
  on_hold: false,
};

test("tax plan cycle validates at the boundary", () => {
  assert.deepEqual(
    taxPlanCycleSchema.parse(validTaxPlanCycle),
    validTaxPlanCycle,
  );
});

test("tax plan cycle rejects unknown stage values with a zod error", () => {
  const result = taxPlanCycleSchema.safeParse({
    ...validTaxPlanCycle,
    stage: "Unknown",
  });

  assert.equal(result.success, false);

  if (!result.success) {
    assert.ok(result.error instanceof z.ZodError);
    assert.equal(result.error.issues[0]?.path[0], "stage");
  }
});

test("tax plan cycle validates owner, priority, due_date, and hold reason boundaries", () => {
  const invalidPayloads = [
    { ...validTaxPlanCycle, client_id: "" },
    { ...validTaxPlanCycle, owner: "" },
    { ...validTaxPlanCycle, priority: "urgent" },
    { ...validTaxPlanCycle, due_date: "12/31/2026" },
    { ...validTaxPlanCycle, on_hold: true },
  ];

  for (const invalidPayload of invalidPayloads) {
    assert.equal(taxPlanCycleSchema.safeParse(invalidPayload).success, false);
  }
});

test("tax plan cycle accepts a hold reason when on hold", () => {
  const heldCycle: TaxPlanCycle = {
    ...validTaxPlanCycle,
    on_hold: true,
    hold_reason: "Awaiting client brokerage statement",
  };

  assert.deepEqual(taxPlanCycleSchema.parse(heldCycle), heldCycle);
});

test("client deduction aggregation payload validates", () => {
  const payload: ClientDeductionAggregationPayload = {
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
    deductions: [
      {
        id: "ded-001",
        date: "2026-07-30",
        description: "Mortgage interest",
        category: deductionCategoryValues[0],
        amount: 18500,
      },
    ],
  };

  assert.deepEqual(
    clientDeductionAggregationPayloadSchema.parse(payload),
    payload,
  );
});

test("client deduction aggregation payload rejects invalid category values", () => {
  const payload: ClientDeductionAggregationPayload = {
    caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22",
    incomeEvents: [
      {
        source: "W-2 wages",
        amount: 125000,
        withholding: 24500,
      },
    ],
    deductions: [
      {
        id: "ded-001",
        date: "2026-07-30",
        description: "Mortgage interest",
        category: deductionCategoryValues[0],
        amount: 18500,
      },
    ],
  };

  const invalidPayload: unknown = {
    ...payload,
    deductions: [
      { ...payload.deductions[0], category: "Mortgage interest" as never },
    ],
  };

  assert.equal(
    clientDeductionAggregationPayloadSchema.safeParse(invalidPayload)
      .success,
    false,
  );
});

test("client deduction aggregation payload rejects negative money amounts", () => {
  const payload: ClientDeductionAggregationPayload = {
    caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22",
    incomeEvents: [
      {
        source: "W-2 wages",
        amount: 125000,
        withholding: 24500,
      },
    ],
    deductions: [
      {
        id: "ded-001",
        date: "2026-07-30",
        description: "Mortgage interest",
        category: deductionCategoryValues[0],
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
      clientDeductionAggregationPayloadSchema.safeParse(invalidPayload)
        .success,
      false,
    );
  }
});
