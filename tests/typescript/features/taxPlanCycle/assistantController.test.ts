import { describe, expect, test } from "vitest";

import {
  createTaxPlanDetailsAssistantController,
  taxPlanDetailsAssistantRequestSchema,
} from "../../../../src/typescript/features/taxPlanCycle/index.js";

describe("tax plan details assistant controller", () => {
  test("accepts only an empty request body schema", () => {
    expect(taxPlanDetailsAssistantRequestSchema.safeParse({}).success).toBe(true);
    expect(taxPlanDetailsAssistantRequestSchema.safeParse({ prompt: "hello" }).success).toBe(false);
  });

  test("returns the temporary stub response", async () => {
    const controller = createTaxPlanDetailsAssistantController();

    await expect(
      Promise.resolve(
        controller.assist({
          tenantId: "tenant-001",
          actor: "advisor-001",
          caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
        }),
      ),
    ).resolves.toEqual({ message: "Hello TaxPulse v2" });
  });
});
