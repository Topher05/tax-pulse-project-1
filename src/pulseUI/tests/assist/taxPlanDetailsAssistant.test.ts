import { describe, expect, test, vi } from "vitest";

import { CaseApiError } from "../../shared/caseApi.ts";
import {
  parseTaxPlanDetailsAssistantErrorMessage,
  postTaxPlanDetailsAssistant,
} from "../../entities/taxPlanDetailsAssistant.ts";

describe("tax plan details assistant API", () => {
  test("posts recommendation context to the case-scoped assistant route", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      expect(input).toBe("/v1/tax-plan-cycles/case-001/assist");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({
          recommendation_context: {
            recommendation: "Apply the estimated-payment safe-harbor threshold for non-withheld income",
            question: "Why is this recommended?",
          },
        }),
      );

      return new Response(
        JSON.stringify({
          explanation: "The recommendation is grounded in the retrieved tax-code chunk.",
          citations: [
            {
              chunk_id: "chunk-1",
              document_id: "doc-1",
              document_title: "Synthetic Estimated Payment Rules",
              document_type: "tax_code",
              fictional_issuer: "Training Revenue Authority",
              section_id: "SYN-TC-4100-b",
              section_path: "Tax Code > Estimated Payments > Thresholds",
              synthetic_notice: "Synthetic training content; rates and limits are invented.",
            },
          ],
        }),
        { status: 200 },
      );
    });

    await expect(
      postTaxPlanDetailsAssistant(
        "case-001",
        {
          recommendation_context: {
            recommendation: "Apply the estimated-payment safe-harbor threshold for non-withheld income",
            question: "Why is this recommended?",
          },
        },
        fetcher,
      ),
    ).resolves.toEqual({
      explanation: "The recommendation is grounded in the retrieved tax-code chunk.",
      citations: [
        expect.objectContaining({
          chunk_id: "chunk-1",
          document_id: "doc-1",
        }),
      ],
    });
  });

  test("uses the server message for an assistant error response", () => {
    expect(
      parseTaxPlanDetailsAssistantErrorMessage(
        new CaseApiError(503, JSON.stringify({ message: "Assistant temporarily unavailable" })),
      ),
    ).toBe("Assistant temporarily unavailable");
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
