import { describe, it, expect, vi } from "vitest";
import {
  retrieveHybridCorpusChunks,
  defaultReranker,
  type ScoredChunk,
} from "../../../../src/typescript/features/assist/retrieval.js";
import type { EmbeddingProvider } from "../../../../src/typescript/features/assist/embeddings.js";
import { allAssistTenantCorpusScopes } from "../../../../src/typescript/features/assist/tenantScopes.js";

const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(async () => [
        {
          chunkId: "lexical-only",
          documentId: "d2",
          documentType: "tax_code",
          sectionId: "lexical-only-section",
          sectionPath: "Tax Code > Estimate > Lexical Only",
          text: "This row should only match through lexical scoring for estimated payments.",
          contentHash: "hash-lexical",
          ordinal: 1,
          citation: {
            documentTitle: "Estimated Payment Lexical Match",
            documentType: "tax_code",
            fictionalIssuer: "Northstar Synthetic Tax Planning Authority",
            tenantId: "tenant-alpha",
            sectionId: "lexical-only-section",
            sectionPath: "Tax Code > Estimate > Lexical Only",
            syntheticNotice: "Synthetic training content only.",
          },
          embeddingModel: "text-embedding-3-small",
          embedding: Array.from({ length: 1536 }, () => 0.01),
        },
      ]),
    })),
  })),
} as any;

const mockProvider: EmbeddingProvider = {
  embed: vi.fn(),
};

vi.mock("../../../../src/typescript/features/assist/embeddings.js", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    retrieveSimilarCorpusChunks: vi.fn(),
  };
});

import { retrieveSimilarCorpusChunks } from "../../../../src/typescript/features/assist/embeddings.js";

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
      { limit: 2, vectorWeight: 0.5, keywordWeight: 0.5, tenantScopes: allAssistTenantCorpusScopes() },
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

  it("includes lexical-only candidates outside the vector shortlist", async () => {
    const mockCandidates = [
      {
        chunkId: "vector-only",
        documentId: "d1",
        sectionId: "vector-section",
        sectionPath: "Tax Code > Vector Only",
        text: "A generic vector candidate with weak lexical relevance.",
        citation: {
          documentTitle: "Vector Candidate",
          documentType: "tax_code",
          fictionalIssuer: "Northstar Synthetic Tax Planning Authority",
          tenantId: "tenant-alpha",
          sectionId: "vector-section",
          sectionPath: "Tax Code > Vector Only",
          syntheticNotice: "Synthetic training content only.",
        },
        similarity: 0.9,
      },
    ];

    vi.mocked(retrieveSimilarCorpusChunks).mockResolvedValue(mockCandidates as any);

    const result = await retrieveHybridCorpusChunks(
      mockDb,
      "estimated payment lexical only",
      {
        limit: 2,
        vectorWeight: 0.2,
        keywordWeight: 0.8,
        candidateLimit: 1,
        tenantScopes: allAssistTenantCorpusScopes(),
      },
      mockProvider,
    );

    expect(result[0]?.chunkId).toBe("lexical-only");
    expect(result.some((candidate) => candidate.chunkId === "lexical-only")).toBe(true);
  });

  it("throws on empty query", async () => {
    await expect(
      retrieveHybridCorpusChunks(
        mockDb,
        "   ",
        { limit: 1, tenantScopes: allAssistTenantCorpusScopes() },
        mockProvider,
      ),
    ).rejects.toThrow("A non-empty query is required for hybrid retrieval.");
  });
});

describe("defaultReranker", () => {
  it("boosts candidates whose leaf heading matches the query", () => {
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

  it("ranks a matching rule leaf above a child that only inherits the rule heading", () => {
    const reranker = defaultReranker();
    const candidates = [
      scoredChunk({
        chunkId: "threshold",
        sectionId: "SYN-TC-4110-b",
        sectionPath:
          "SYN-TC-4110 Estimated Payment Safe-Harbor Thresholds > SYN-TC-4110-b Single filer safe-harbor threshold",
      }),
      scoredChunk({
        chunkId: "documentation",
        sectionId: "SYN-TC-4110-d",
        sectionPath:
          "SYN-TC-4110 Estimated Payment Safe-Harbor Thresholds > SYN-TC-4110-b Single filer safe-harbor threshold > SYN-TC-4110-d Single filer documentation note",
      }),
    ];

    const result = reranker.rerank(
      "For a single filer, what safe-harbor threshold should be cited?",
      candidates,
    ) as unknown as ScoredChunk[];

    expect(result[0]?.sectionId).toBe("SYN-TC-4110-b");
  });

  it("can still rank a child first when the query asks for its documentation note", () => {
    const reranker = defaultReranker();
    const candidates = [
      scoredChunk({
        chunkId: "threshold",
        sectionId: "SYN-TC-4110-b",
        sectionPath:
          "SYN-TC-4110 Estimated Payment Safe-Harbor Thresholds > SYN-TC-4110-b Single filer safe-harbor threshold",
      }),
      scoredChunk({
        chunkId: "documentation",
        sectionId: "SYN-TC-4110-d",
        sectionPath:
          "SYN-TC-4110 Estimated Payment Safe-Harbor Thresholds > SYN-TC-4110-b Single filer safe-harbor threshold > SYN-TC-4110-d Single filer documentation note",
      }),
    ];

    const result = reranker.rerank(
      "What should the single filer documentation note include?",
      candidates,
    ) as unknown as ScoredChunk[];

    expect(result[0]?.sectionId).toBe("SYN-TC-4110-d");
  });

  it("boosts only the exact section ID named in the query", () => {
    const reranker = defaultReranker();
    const candidates = [
      scoredChunk({
        chunkId: "joint",
        sectionId: "SYN-TC-4110-a",
        sectionPath: "Rules > SYN-TC-4110-a Joint filer threshold",
      }),
      scoredChunk({
        chunkId: "single",
        sectionId: "SYN-TC-4110-b",
        sectionPath: "Rules > SYN-TC-4110-b Single filer threshold",
      }),
    ];

    const result = reranker.rerank(
      "Use section SYN-TC-4110-b for this recommendation",
      candidates,
    ) as Array<ScoredChunk & { rerankScore: number }>;
    const single = result.find((candidate) => candidate.sectionId === "SYN-TC-4110-b");
    const joint = result.find((candidate) => candidate.sectionId === "SYN-TC-4110-a");

    expect(result[0]?.sectionId).toBe("SYN-TC-4110-b");
    expect(single?.rerankScore).toBeGreaterThan(joint?.rerankScore ?? Number.POSITIVE_INFINITY);
  });

  it("uses chunk ID as the deterministic tie-break", () => {
    const reranker = defaultReranker();
    const candidates = [
      scoredChunk({ chunkId: "chunk-b", sectionId: "section-b", sectionPath: "Rules > Other" }),
      scoredChunk({ chunkId: "chunk-a", sectionId: "section-a", sectionPath: "Rules > Other" }),
    ];

    const result = reranker.rerank(
      "unmatched query",
      candidates,
    ) as unknown as ScoredChunk[];

    expect(result.map((candidate) => candidate.chunkId)).toEqual(["chunk-a", "chunk-b"]);
  });
});

function scoredChunk(overrides: {
  chunkId: string;
  sectionId: string;
  sectionPath: string;
}): ScoredChunk {
  return {
    documentId: "synthetic-document",
    documentType: "tax_code",
    text: "Synthetic retrieval text.",
    citation: { documentTitle: "Synthetic Tax Rules" } as any,
    similarity: 0.5,
    vectorScore: 0.5,
    keywordScore: 0.5,
    hybridScore: 0.5,
    ...overrides,
  } as ScoredChunk;
}
