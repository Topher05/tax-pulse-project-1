import { describe, expect, test } from "vitest";

import {
  incomeEventCreateSchema,
  incomeEventReadParamsSchema,
  maximumIncomeEventSourceLength,
} from "../../../../src/typescript/index.js";

describe("income-event schemas", () => {
  test("normalizes a valid create request", () => {
    expect(
      incomeEventCreateSchema.parse({
        source: " Acme Corporation ",
        type: "w2",
        amount: 900.5,
        withholding: 125.25,
      }),
    ).toEqual({
      source: "Acme Corporation",
      type: "w2",
      amount: 900.5,
      withholding: 125.25,
    });
  });

  test.each([
    ["unknown fields", { source: "Acme", type: "w2", amount: 1, withholding: 0, tenantId: "other" }],
    ["blank source", { source: " ", type: "w2", amount: 1, withholding: 0 }],
    [
      "oversized source",
      {
        source: "x".repeat(maximumIncomeEventSourceLength + 1),
        type: "w2",
        amount: 1,
        withholding: 0,
      },
    ],
    ["unknown type", { source: "Acme", type: "salary", amount: 1, withholding: 0 }],
    ["string amount", { source: "Acme", type: "w2", amount: "1.00", withholding: 0 }],
    ["empty string amount", { source: "Acme", type: "w2", amount: "", withholding: 0 }],
    ["null amount", { source: "Acme", type: "w2", amount: null, withholding: 0 }],
    ["string withholding", { source: "Acme", type: "w2", amount: 1, withholding: "0.00" }],
    ["empty string withholding", { source: "Acme", type: "w2", amount: 1, withholding: "" }],
    ["null withholding", { source: "Acme", type: "w2", amount: 1, withholding: null }],
    ["negative amount", { source: "Acme", type: "w2", amount: -1, withholding: 0 }],
    [
      "numeric overflow",
      { source: "Acme", type: "w2", amount: 1_000_000_000_000, withholding: 0 },
    ],
  ])("rejects %s", (_name, input) => {
    expect(incomeEventCreateSchema.safeParse(input).success).toBe(false);
  });

  test("requires a UUID-shaped case path parameter", () => {
    expect(incomeEventReadParamsSchema.safeParse({ caseId: "not-a-uuid" }).success).toBe(false);
    expect(
      incomeEventReadParamsSchema.safeParse({
        caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
      }).success,
    ).toBe(true);
  });
});
