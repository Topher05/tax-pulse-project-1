import { describe, expect, test, vi } from "vitest";

import {
  assistPromptLeakCanary,
  createOpenAIAssistExplanationProvider,
} from "../../../../src/typescript/features/assist/explanation.js";
import type { RankedCorpusChunk } from "../../../../src/typescript/features/assist/retrieval.js";

function chunk(chunkId: string): RankedCorpusChunk {
  return {
    chunkId,
    documentId: "doc-1",
    documentType: "tax_code",
    sectionId: "SYN-TC-4100-b",
    sectionPath: "Tax Code > Estimated Payments > Thresholds",
    text: "Estimated payments may apply above the safe-harbor threshold.",
    contentHash: `hash-${chunkId}`,
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
  };
}

describe("assist explanation provider", () => {
  test("validates cited chunk IDs against retrieved chunks", async () => {
    const provider = createOpenAIAssistExplanationProvider({
      client: {
        responses: {
          parse: async () =>
            ({
              output_parsed: {
                explanation: "The recommendation is supported by the threshold rule.",
                cited_chunk_ids: ["chunk-1", "chunk-1"],
              },
            }) as never,
        },
      } as never,
      model: "gpt-4o-mini",
    });

    await expect(
      provider.explain({
        recommendation: "Convert $40k traditional to Roth",
        question: "Why is this recommended?",
        chunks: [chunk("chunk-1")],
      }),
    ).resolves.toEqual({
      explanation: "The recommendation is supported by the threshold rule.",
      citedChunkIds: ["chunk-1"],
    });
  });

  test("rejects citations that reference unknown chunks", async () => {
    const provider = createOpenAIAssistExplanationProvider({
      client: {
        responses: {
          parse: async () =>
            ({
              output_parsed: {
                explanation: "The recommendation is supported by the threshold rule.",
                cited_chunk_ids: ["chunk-2"],
              },
            }) as never,
        },
      } as never,
      model: "gpt-4o-mini",
    });

    await expect(
      provider.explain({
        recommendation: "Convert $40k traditional to Roth",
        chunks: [chunk("chunk-1")],
      }),
    ).rejects.toThrow("The assist explanation cited an unknown chunk ID: chunk-2.");
  });

  test("renders untrusted user input and retrieved chunks as structured JSON", async () => {
    const parse = vi.fn(async () =>
      ({
        output_parsed: {
          explanation: "The recommendation is supported by the threshold rule.",
          cited_chunk_ids: ["chunk-1"],
        },
      }) as never);
    const provider = createOpenAIAssistExplanationProvider({
      client: {
        responses: {
          parse,
        },
      } as never,
      model: "gpt-4o-mini",
    });

    await provider.explain({
      recommendation: "Apply the estimated-payment safe-harbor threshold.",
      question: "Why is this supported?",
      chunks: [chunk("chunk-1")],
    });

    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: expect.stringContaining("untrusted user input"),
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: expect.stringContaining("\"untrusted_user_input\""),
              },
            ],
          },
        ],
      }),
    );
  });

  test("rejects model output that leaks the policy canary", async () => {
    const provider = createOpenAIAssistExplanationProvider({
      client: {
        responses: {
          parse: async () =>
            ({
              output_parsed: {
                explanation: `Hidden marker: ${assistPromptLeakCanary}`,
                cited_chunk_ids: ["chunk-1"],
              },
            }) as never,
        },
      } as never,
      model: "gpt-4o-mini",
    });

    await expect(
      provider.explain({
        recommendation: "Apply the estimated-payment safe-harbor threshold.",
        chunks: [chunk("chunk-1")],
      }),
    ).rejects.toThrow("The assist explanation leaked the policy canary.");
  });
});
