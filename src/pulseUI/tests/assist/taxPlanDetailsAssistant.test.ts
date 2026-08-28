import { describe, expect, test, vi } from "vitest";

import { CaseApiError } from "../../shared/caseApi.ts";
import {
  buildTaxPlanDetailsAssistantRecommendation,
  parseTaxPlanDetailsAssistantError,
  postTaxPlanDetailsAssistant,
  taxPlanDetailsAssistantQuestionMaxLength,
  validateTaxPlanDetailsAssistantQuestion,
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

  test("omits the optional question from the initial request", async () => {
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init?.body).toBe(
        JSON.stringify({
          recommendation_context: {
            recommendation: "Tax Plan Cycle in Review case owned by Maya Reed",
          },
        }),
      );

      return new Response(JSON.stringify({ explanation: "Initial explanation", citations: [] }));
    });

    await postTaxPlanDetailsAssistant(
      "case-001",
      {
        recommendation_context: {
          recommendation: "Tax Plan Cycle in Review case owned by Maya Reed",
        },
      },
      fetcher,
    );
  });

  test("builds a recommendation from case details", () => {
    expect(
      buildTaxPlanDetailsAssistantRecommendation({
        stage: "Review",
        owner: "Maya Reed",
        priority: "High",
        verifiedName: "North Shore Family Office",
        provider: "tivs",
      }),
    ).toBe(
      "Tax Plan Cycle in Review case owned by Maya Reed with a High priority for the taxpayer North Shore Family Office from tivs",
    );
  });

  test("uses placeholders for missing recommendation fields", () => {
    expect(
      buildTaxPlanDetailsAssistantRecommendation({
        stage: " ",
        owner: null,
        priority: undefined,
        verifiedName: "",
        provider: null,
      }),
    ).toBe(
      "Tax Plan Cycle in ... case owned by ... with a ... priority for the taxpayer ... from ...",
    );
  });

  test.each([400, 401, 403, 404, 422, 500, 503])(
    "parses the title and detail for HTTP %s Problem Details",
    (status) => {
      expect(
        parseTaxPlanDetailsAssistantError(
          new CaseApiError(
            status,
            JSON.stringify({ title: "Assistant unavailable", detail: `Failure ${status}` }),
          ),
        ),
      ).toEqual({ title: "Assistant unavailable", detail: `Failure ${status}`, status });
    },
  );

  test("prefers title and message while allowing code as the header fallback", () => {
    expect(
      parseTaxPlanDetailsAssistantError(
        new CaseApiError(
          503,
          JSON.stringify({
            title: "Service unavailable",
            code: "ASSIST_UNAVAILABLE",
            message: "Assistant temporarily unavailable",
            detail: "Fallback detail",
          }),
        ),
      ),
    ).toEqual({
      title: "Service unavailable",
      detail: "Assistant temporarily unavailable",
      status: 503,
    });
    expect(
      parseTaxPlanDetailsAssistantError(
        new CaseApiError(422, JSON.stringify({ code: "UNSUPPORTED_CONTEXT", detail: "No match." })),
      ),
    ).toEqual({ title: "UNSUPPORTED_CONTEXT", detail: "No match.", status: 422 });
  });

  test("handles empty, raw, and generic assistant failures", () => {
    expect(parseTaxPlanDetailsAssistantError(new CaseApiError(500, ""))).toEqual({
      title: "Assistant request failed",
      detail: "Assistant request failed with HTTP 500.",
      status: 500,
    });
    expect(parseTaxPlanDetailsAssistantError(new CaseApiError(502, "upstream unavailable"))).toEqual({
      title: "Assistant request failed",
      detail: "upstream unavailable",
      status: 502,
    });
    expect(parseTaxPlanDetailsAssistantError(new Error("network down"))).toEqual({
      title: "Assistant request failed",
      detail: "network down",
    });
    expect(parseTaxPlanDetailsAssistantError(null)).toEqual({
      title: "Assistant request failed",
      detail: "The assistant request could not be completed.",
    });
  });

  test("validates and normalizes follow-up questions", () => {
    expect(validateTaxPlanDetailsAssistantQuestion("  Why is this recommended?  ")).toEqual({
      isValid: true,
      question: "Why is this recommended?",
    });
    expect(validateTaxPlanDetailsAssistantQuestion(" \n\t ")).toMatchObject({ isValid: false });
    expect(
      validateTaxPlanDetailsAssistantQuestion(
        "a".repeat(taxPlanDetailsAssistantQuestionMaxLength + 1),
      ),
    ).toMatchObject({ isValid: false });
    expect(validateTaxPlanDetailsAssistantQuestion("Unsafe\u0000question")).toEqual({
      isValid: false,
      message: "Remove unsupported control characters before sending.",
    });
    expect(validateTaxPlanDetailsAssistantQuestion("Line one\nLine two\tvalue")).toMatchObject({
      isValid: true,
    });
  });
});
