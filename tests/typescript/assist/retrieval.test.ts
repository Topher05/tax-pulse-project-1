import { describe, it, expect, vi } from "vitest";
import {
  retrieveHybridCorpusChunks,
  defaultReranker,
  type ScoredChunk,
} from "../../../src/typescript/assist/retrieval.js";
import type { EmbeddingProvider } from "../../../src/typescript/assist/embeddings.js";

const mockDb = {} as any;

const mockProvider: EmbeddingProvider = {
  embed: vi.fn(),
};

vi.mock("../../../src/typescript/assist/embeddings.js", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    retrieveSimilarCorpusChunks: vi.fn(),
  };
});

import { retrieveSimilarCorpusChunks } from "../../../src/typescript/assist/embeddings.js";

describe("retrieveHybridCorpusChunks", () => {
  it("combines vector score and keyword score", async () => {
    const mockCandidates = [
      {
        chunkId: "c1",
        documentId: "d1",
        sectionId: "s1",
        sectionPath: "Tax Code > Income",
        text: "This chunk mentions income and taxes.",
        citation: { documentTitle: "Tax Code" },
        similarity: 0.9,
      },
      {
        chunkId: "c2",
        documentId: "d1",
        sectionId: "s2",
        sectionPath: "Tax Code > Deductions",
        text: "This chunk is about deductions.",
        citation: { documentTitle: "Tax Code" },
        similarity: 0.8,
      },
    ];

    vi.mocked(retrieveSimilarCorpusChunks).mockResolvedValue(mockCandidates as any);

    const result = await retrieveHybridCorpusChunks(
      mockDb,
      "income tax",
      { limit: 2, vectorWeight: 0.5, keywordWeight: 0.5 },
      mockProvider,
    );

    expect(result.length).toBe(2);
    const c1 = result.find((r) => r.chunkId === "c1");
    const c2 = result.find((r) => r.chunkId === "c2");

    expect(c1).toBeDefined();
    expect(c2).toBeDefined();
    expect(c1!.keywordScore).toBeGreaterThan(c2!.keywordScore);
    expect(c1!.hybridScore).toBeGreaterThan(c2!.hybridScore);
  });

  it("throws on empty query", async () => {
    await expect(
      retrieveHybridCorpusChunks(mockDb, "   ", { limit: 1 }, mockProvider),
    ).rejects.toThrow("A non-empty query is required for hybrid retrieval.");
  });
});

describe("defaultReranker", () => {
  it("boosts candidates with exact section path or id matches", () => {
    const reranker = defaultReranker();

    const candidates: ScoredChunk[] = [
      {
        chunkId: "c1",
        documentId: "d1",
        sectionId: "capital-gains",
        sectionPath: "IRS rules > capital gains",
        text: "Some text",
        citation: { documentTitle: "Title" } as any,
        similarity: 0.5,
        vectorScore: 0.5,
        keywordScore: 0.5,
        hybridScore: 0.5,
      },
      {
        chunkId: "c2",
        documentId: "d1",
        sectionId: "standard-deductions",
        sectionPath: "IRS rules > standard deductions",
        text: "Some text",
        citation: { documentTitle: "Title" } as any,
        similarity: 0.5,
        vectorScore: 0.5,
        keywordScore: 0.5,
        hybridScore: 0.5,
      },
    ] as any;

    const result = reranker.rerank("capital gains", candidates) as any[];

    expect(result[0].chunkId).toBe("c1");
    expect(result[0].rerankScore).toBeGreaterThan(0.5);
    expect(result[1].chunkId).toBe("c2");
    expect(result[1].rerankScore).toBe(0.5);
  });
});
