import { describe, expect, test } from "vitest";

import {
  isPlanToolPath,
  isUuid,
  normalizePlanToolSearch,
  validatePlanToolSearch,
} from "../../shared/planToolCase.ts";

const validCaseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12";

describe("planToolCase", () => {
  test("identifies plan tool paths", () => {
    expect(isPlanToolPath("/deductions")).toBe(true);
    expect(isPlanToolPath("/scenarios")).toBe(true);
    expect(isPlanToolPath("/quarterly-payments")).toBe(true);
    expect(isPlanToolPath("/income")).toBe(true);
    expect(isPlanToolPath("/firm/settings")).toBe(false);
  });

  test("validates UUID-shaped values", () => {
    expect(isUuid(validCaseId)).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("018d6c1a-3f9b-7c28-8d1a")).toBe(false);
    expect(isUuid("")).toBe(false);
  });

  test("validates router search into the plan tool search contract", () => {
    expect(validatePlanToolSearch({ caseId: validCaseId })).toEqual({ caseId: validCaseId });
    expect(validatePlanToolSearch({ caseId: ` ${validCaseId} ` })).toEqual({ caseId: validCaseId });
    expect(validatePlanToolSearch({ caseId: "not-a-uuid" })).toEqual({ invalidCaseId: true });
    expect(validatePlanToolSearch({ caseId: "" })).toEqual({});
    expect(validatePlanToolSearch({})).toEqual({});
  });

  test("normalizes router search into valid, missing, and invalid states", () => {
    expect(normalizePlanToolSearch({ caseId: validCaseId })).toEqual({
      caseId: validCaseId,
      hasInvalidCaseId: false,
    });
    expect(normalizePlanToolSearch({})).toEqual({
      caseId: null,
      hasInvalidCaseId: false,
    });
    expect(normalizePlanToolSearch({ caseId: "not-a-uuid" })).toEqual({
      caseId: null,
      hasInvalidCaseId: true,
    });
    expect(normalizePlanToolSearch({ invalidCaseId: true })).toEqual({
      caseId: null,
      hasInvalidCaseId: true,
    });
  });
});
