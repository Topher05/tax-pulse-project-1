import { describe, expect, test, vi } from "vitest";

import { CaseApiError } from "../../shared/caseApi.ts";
import {
  parseTaxPlanDetailsAssistantErrorMessage,
  postTaxPlanDetailsAssistant,
} from "../../entities/taxPlanDetailsAssistant.ts";

describe("tax plan details assistant API", () => {
  test("posts an empty body to the case-scoped assistant route", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      expect(input).toBe("/v1/tax-plan-cycles/case-001/assist");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe("{}");

      return new Response(JSON.stringify({ message: "hello Tax Pulse v2" }), { status: 200 });
    });

    await expect(postTaxPlanDetailsAssistant("case-001", fetcher)).resolves.toEqual({
      message: "hello Tax Pulse v2",
    });
  });

  test("uses the server message for a stub error response", () => {
    expect(
      parseTaxPlanDetailsAssistantErrorMessage(
        new CaseApiError(418, JSON.stringify({ message: "hello Tax Pulse v2" })),
      ),
    ).toBe("hello Tax Pulse v2");
  });

  test("falls back to Problem Details detail text for assistant errors", () => {
    expect(
      parseTaxPlanDetailsAssistantErrorMessage(
        new CaseApiError(403, JSON.stringify({ detail: "Client users cannot access the assistant." })),
      ),
    ).toBe("Client users cannot access the assistant.");
  });

  test("handles empty, raw, and generic assistant failures", () => {
    expect(parseTaxPlanDetailsAssistantErrorMessage(new CaseApiError(500, ""))).toBe(
      "Assistant request failed with HTTP 500.",
    );
    expect(parseTaxPlanDetailsAssistantErrorMessage(new CaseApiError(502, "upstream unavailable"))).toBe(
      "upstream unavailable",
    );
    expect(parseTaxPlanDetailsAssistantErrorMessage(new Error("network down"))).toBe("network down");
    expect(parseTaxPlanDetailsAssistantErrorMessage(null)).toBe("The assistant request could not be completed.");
  });
});
