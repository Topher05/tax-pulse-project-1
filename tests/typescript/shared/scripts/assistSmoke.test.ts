import { describe, expect, test } from "vitest";

import { runAssistSmoke } from "../../../../src/typescript/shared/scripts/assistSmoke.js";

describe("assist smoke", () => {
  test("checks grounded and prompt-injection responses", async () => {
    const responses = [
      {
        status: 200,
        body: {
          explanation: "The recommendation is grounded in the threshold rule.",
          citations: [{ chunk_id: "chunk-1" }],
        },
      },
      {
        status: 422,
        body: {
          type: "https://taxpulse.example/problems/assistant-prompt-injection-detected",
          title: "Assistant Request Rejected",
          status: 422,
        },
      },
    ];
    const fetchImpl: typeof fetch = (async () => {
      const next = responses.shift();

      if (!next) {
        throw new Error("unexpected fetch invocation");
      }

      return new Response(JSON.stringify(next.body), {
        status: next.status,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;
    process.env.JWT_ISSUER = "https://auth.taxpulse.example";
    process.env.JWT_AUDIENCE = "taxpulse-http-api";
    process.env.JWT_SIGNING_SECRET = "a-unique-test-secret-that-is-more-than-32-bytes";

    await expect(
      runAssistSmoke({
        coreBaseUrl: "http://127.0.0.1:3000",
        caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d11",
        tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
        userId: "assist-smoke-advisor",
        fetchImpl,
        retryAttempts: 1,
      }),
    ).resolves.toEqual({
      groundedStatus: 200,
      groundedCitationCount: 1,
      promptInjectionStatus: 422,
    });
  });
});
