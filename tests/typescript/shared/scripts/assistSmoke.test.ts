import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { describe, expect, test, vi } from "vitest";

import { loadAssistPromptInjectionFixtures } from "../../../../src/typescript/assist/promptInjectionFixtures.js";
import type { RankedCorpusChunk } from "../../../../src/typescript/assist/retrieval.js";
import {
  createTaxPlanCycleRouter,
  createTaxPlanDetailsAssistantController,
} from "../../../../src/typescript/features/taxPlanCycle/index.js";
import {
  createApp,
  createLogger,
} from "../../../../src/typescript/index.js";
import { runAssistSmoke } from "../../../../src/typescript/shared/scripts/assistSmoke.js";

const caseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d11";
const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";

function buildGroundedChunk(): RankedCorpusChunk {
  return {
    chunkId: "chunk-1",
    documentId: "doc-1",
    documentType: "tax_code",
    sectionId: "SYN-TC-4100-b",
    sectionPath: "Tax Code > Estimated Payments > Safe-Harbor Threshold",
    text: "Estimated payments may apply above the safe-harbor threshold for non-withheld income.",
    contentHash: "hash-1",
    ordinal: 1,
    embeddingModel: "text-embedding-3-small",
    embedding: [],
    similarity: 0.9,
    vectorScore: 0.9,
    keywordScore: 0.8,
    hybridScore: 0.87,
    rerankScore: 0.92,
    citation: {
      documentTitle: "Synthetic Estimated Payment Rules",
      documentType: "tax_code",
      fictionalIssuer: "Training Revenue Authority",
      tenantId: "tenant-alpha",
      sectionId: "SYN-TC-4100-b",
      sectionPath: "Tax Code > Estimated Payments > Safe-Harbor Threshold",
      syntheticNotice: "Synthetic training content; rates and limits are invented.",
    },
  };
}

describe("assist smoke", () => {
  test("submits every checked-in prompt-injection fixture to the real endpoint", async () => {
    const fixtures = loadAssistPromptInjectionFixtures();
    vi.stubEnv("JWT_ISSUER", "https://auth.taxpulse.example");
    vi.stubEnv("JWT_AUDIENCE", "taxpulse-http-api");
    vi.stubEnv("JWT_SIGNING_SECRET", "a-unique-test-secret-that-is-more-than-32-bytes");
    const retrieve = vi.fn(async () => [buildGroundedChunk()]);
    const explain = vi.fn(async () => ({
      explanation: "The recommendation is grounded in the threshold rule.",
      citedChunkIds: ["chunk-1"],
    }));
    const assistantController = createTaxPlanDetailsAssistantController({
      taxPlanCycleRepository: {
        async findByCaseId() {
          return { id: caseId };
        },
      },
      tenantScopeMap: new Map([[tenantId, "tenant-alpha"]]),
      retriever: { retrieve },
      explanationProvider: { explain },
    });
    const app = createApp({
      logger: createLogger({ level: "silent" }),
      registerRoutes(app) {
        app.use((req, _res, next) => {
          req.tenant = { id: tenantId };
          req.user = { id: "assist-smoke-advisor", role: "Advisor" };
          next();
        });
        app.use(
          "/v1",
          createTaxPlanCycleRouter({
            assistantController,
            controller: {
              create: vi.fn(),
              findByCaseId: vi.fn(async () => null),
            },
          }),
        );
      },
    });
    const server = app.listen(0);
    await once(server, "listening");

    try {
      const address = server.address() as AddressInfo;

      await expect(
        runAssistSmoke({
          coreBaseUrl: `http://127.0.0.1:${address.port}`,
          caseId,
          tenantId,
          userId: "assist-smoke-advisor",
          retryAttempts: 1,
        }),
      ).resolves.toEqual({
        groundedStatus: 200,
        groundedCitationCount: 1,
        promptInjectionResults: fixtures.map((fixture) => ({
          id: fixture.id,
          status: 422,
        })),
      });
    } finally {
      server.close();
      await once(server, "close");
    }

    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(explain).toHaveBeenCalledTimes(1);
  });
});
