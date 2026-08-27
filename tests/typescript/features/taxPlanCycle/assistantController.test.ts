import { describe, expect, test } from "vitest";

import {
  createTaxPlanDetailsAssistantController,
  taxPlanDetailsAssistantRequestSchema,
  TaxPlanDetailsAssistantCaseNotFoundError,
} from "../../../../src/typescript/features/taxPlanCycle/index.js";
import type { RankedCorpusChunk } from "../../../../src/typescript/assist/retrieval.js";

describe("tax plan details assistant controller", () => {
  test("requires a recommendation context with a recommendation", () => {
    expect(
      taxPlanDetailsAssistantRequestSchema.safeParse({
        recommendation_context: {
          recommendation: "Convert $40k traditional to Roth",
        },
      }).success,
    ).toBe(true);
    expect(taxPlanDetailsAssistantRequestSchema.safeParse({}).success).toBe(false);
    expect(
      taxPlanDetailsAssistantRequestSchema.safeParse({
        recommendation_context: {
          question: "Why is this recommended?",
        },
      }).success,
    ).toBe(false);
  });

  test("returns a grounded explanation and public citations", async () => {
    const retrievedChunks: RankedCorpusChunk[] = [
      {
        chunkId: "chunk-1",
        documentId: "doc-1",
        documentType: "tax_code",
        sectionId: "SYN-TC-4100-b",
        sectionPath: "Tax Code > Estimated Payments > Thresholds",
        text: "Estimated payments may apply above the safe-harbor threshold.",
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
          sectionPath: "Tax Code > Estimated Payments > Thresholds",
          syntheticNotice: "Synthetic training content; rates and limits are invented.",
        },
      },
    ];
    const controller = createTaxPlanDetailsAssistantController({
      taxPlanCycleRepository: {
        async findByCaseId() {
          return { id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12" };
        },
      },
      tenantScopeMap: new Map([
        ["018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01", "tenant-alpha"],
      ]),
      retriever: {
        async retrieve() {
          return retrievedChunks;
        },
      },
      explanationProvider: {
        async explain() {
          return {
            explanation: "The recommendation is supported by the estimated-payment threshold rule.",
            citedChunkIds: ["chunk-1"],
          };
        },
      },
    });

    await expect(
      controller.assist({
        tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
        actor: "advisor-001",
        caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
        recommendation_context: {
          recommendation: "Convert $40k traditional to Roth",
          question: "Why is this recommended?",
        },
      }),
    ).resolves.toEqual({
      explanation: "The recommendation is supported by the estimated-payment threshold rule.",
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
    });
  });

  test("returns not found when the case cannot be loaded in-tenant", async () => {
    const controller = createTaxPlanDetailsAssistantController({
      taxPlanCycleRepository: {
        async findByCaseId() {
          return null;
        },
      },
      tenantScopeMap: new Map([
        ["018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01", "tenant-alpha"],
      ]),
      retriever: {
        async retrieve() {
          return [];
        },
      },
      explanationProvider: {
        async explain() {
          return { explanation: "unused", citedChunkIds: ["chunk-1"] };
        },
      },
    });

    await expect(
      controller.assist({
        tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
        actor: "advisor-001",
        caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
        recommendation_context: {
          recommendation: "Convert $40k traditional to Roth",
        },
      }),
    ).rejects.toBeInstanceOf(TaxPlanDetailsAssistantCaseNotFoundError);
  });
});
