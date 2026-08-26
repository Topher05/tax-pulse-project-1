import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { aiAssistCorpusEmbedding } from "../shared/database/schema.js";
import {
  type SimilarCorpusChunk,
  retrieveSimilarCorpusChunks,
  type EmbeddingProvider,
} from "./embeddings.js";
import type { CorpusCitation, CorpusDocumentType } from "./corpus.js";

export interface HybridRetrievalOptions {
  limit: number;
  candidateLimit?: number;
  vectorWeight?: number;
  keywordWeight?: number;
}

const chunkTextWeight = 1;
const leafHeadingWeight = 3;
const documentTitleWeight = 1;

export interface ScoredChunk extends SimilarCorpusChunk {
  vectorScore: number;
  keywordScore: number;
  hybridScore: number;
}

export interface RankedCorpusChunk extends ScoredChunk {
  rerankScore: number;
}

export interface Reranker {
  rerank(
    query: string,
    candidates: readonly ScoredChunk[],
  ): Promise<readonly RankedCorpusChunk[]> | readonly RankedCorpusChunk[];
}

export function defaultReranker(): Reranker {
  return {
    rerank(query: string, candidates: readonly ScoredChunk[]): readonly RankedCorpusChunk[] {
      const queryTokens = tokenize(query);
      const meaningfulQueryTokens = removeStopWords(queryTokens);
      const normalizedQuery = ` ${normalizeText(query)} `;

      const ranked = candidates.map((candidate) => {
        let rerankScore = candidate.hybridScore;

        const leafHeading = extractLeafSectionHeading(candidate.sectionPath, candidate.sectionId);
        const leafHeadingTokens = tokenize(leafHeading);
        const headingCoverage =
          meaningfulQueryTokens.size > 0
            ? Array.from(meaningfulQueryTokens).filter((token) => leafHeadingTokens.has(token)).length /
              meaningfulQueryTokens.size
            : 0;
        rerankScore += headingCoverage * 0.5;

        const normalizedSectionId = normalizeText(candidate.sectionId).replace(/[^a-z0-9]+/g, " ").trim();
        if (normalizedSectionId && normalizedQuery.includes(` ${normalizedSectionId} `)) {
          rerankScore += 0.5;
        }

        return {
          ...candidate,
          rerankScore,
        };
      });

      return ranked.sort((left, right) => {
        if (right.rerankScore !== left.rerankScore) {
          return right.rerankScore - left.rerankScore;
        }
        return left.chunkId.localeCompare(right.chunkId);
      });
    },
  };
}

export async function retrieveHybridCorpusChunks(
  db: NodePgDatabase<Record<string, unknown>>,
  query: string,
  options: HybridRetrievalOptions,
  provider: EmbeddingProvider,
  reranker: Reranker = defaultReranker(),
): Promise<RankedCorpusChunk[]> {
  if (!query.trim()) {
    throw new Error("A non-empty query is required for hybrid retrieval.");
  }

  const limit = Math.max(0, Math.floor(options.limit));
  if (limit === 0) {
    return [];
  }

  const candidateLimit = options.candidateLimit ?? Math.max(10, limit * 5);
  const vectorWeight = options.vectorWeight ?? 0.7;
  const keywordWeight = options.keywordWeight ?? 0.3;

  const vectorCandidates = await retrieveSimilarCorpusChunks(db, query, candidateLimit, provider);
  const lexicalCandidates = await retrieveLexicalCorpusChunks(db, query, candidateLimit);
  const queryTokens = tokenize(query);
  const meaningfulQueryTokens = removeStopWords(queryTokens);
  const candidatesById = new Map<string, SimilarCorpusChunk & { vectorScore: number; keywordScore: number }>();

  for (const candidate of vectorCandidates) {
    candidatesById.set(candidate.chunkId, {
      ...candidate,
      vectorScore: candidate.similarity,
      keywordScore: 0,
    });
  }

  for (const candidate of lexicalCandidates) {
    if (!candidatesById.has(candidate.chunkId)) {
      candidatesById.set(candidate.chunkId, {
        ...candidate,
        vectorScore: 0,
        keywordScore: 0,
      });
    }
  }

  const scoredCandidates: ScoredChunk[] = Array.from(candidatesById.values()).map((candidate) => {
    const textTokens = tokenize(candidate.text);
    const leafHeadingTokens = tokenize(extractLeafSectionHeading(candidate.sectionPath, candidate.sectionId));
    const titleTokens = tokenize(candidate.citation.documentTitle);

    let keywordRawScore = 0;
    for (const token of meaningfulQueryTokens) {
      if (textTokens.has(token)) {
        keywordRawScore += chunkTextWeight;
      }
      if (leafHeadingTokens.has(token)) {
        keywordRawScore += leafHeadingWeight;
      }
      if (titleTokens.has(token)) {
        keywordRawScore += documentTitleWeight;
      }
    }

    const maxPossibleKeywordScore =
      meaningfulQueryTokens.size * (chunkTextWeight + leafHeadingWeight + documentTitleWeight);
    const keywordScore = maxPossibleKeywordScore > 0 ? keywordRawScore / maxPossibleKeywordScore : 0;
    const vectorScore = Math.max(0, Math.min(1, candidate.vectorScore));
    const hybridScore = vectorScore * vectorWeight + keywordScore * keywordWeight;

    return {
      ...candidate,
      vectorScore,
      keywordScore,
      hybridScore,
    };
  });

  const rankedCandidates = await reranker.rerank(query, scoredCandidates);
  return rankedCandidates.slice(0, limit);
}

async function retrieveLexicalCorpusChunks(
  db: NodePgDatabase<Record<string, unknown>>,
  query: string,
  limit: number,
): Promise<SimilarCorpusChunk[]> {
  const queryTokens = tokenize(query);
  const meaningfulQueryTokens = removeStopWords(queryTokens);
  if (meaningfulQueryTokens.size === 0) {
    return [];
  }

  const rows = await db.select().from(aiAssistCorpusEmbedding);
  const scoredRows = rows.map((row) => {
    const textTokens = tokenize(row.text);
    const leafHeadingTokens = tokenize(extractLeafSectionHeading(row.sectionPath, row.sectionId));
    const citation = row.citation as CorpusCitation;
    const titleTokens = tokenize(citation.documentTitle ?? "");

    let keywordRawScore = 0;
    for (const token of meaningfulQueryTokens) {
      if (textTokens.has(token)) {
        keywordRawScore += chunkTextWeight;
      }
      if (leafHeadingTokens.has(token)) {
        keywordRawScore += leafHeadingWeight;
      }
      if (titleTokens.has(token)) {
        keywordRawScore += documentTitleWeight;
      }
    }

    return {
      ...row,
      documentType: row.documentType as CorpusDocumentType,
      citation,
      similarity: Math.max(
        0,
        Math.min(
          1,
          keywordRawScore /
            Math.max(1, queryTokens.size * (chunkTextWeight + leafHeadingWeight + documentTitleWeight)),
        ),
      ),
    } satisfies SimilarCorpusChunk;
  });

  return scoredRows
    .filter((candidate) => candidate.similarity > 0)
    .sort((left, right) => {
      if (right.similarity !== left.similarity) {
        return right.similarity - left.similarity;
      }
      return left.chunkId.localeCompare(right.chunkId);
    })
    .slice(0, Math.max(0, limit));
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((token) => token.length > 2) ?? [],
  );
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function removeStopWords(tokens: ReadonlySet<string>): Set<string> {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "are",
    "but",
    "not",
    "with",
    "from",
    "what",
    "should",
    "could",
    "would",
    "cited",
    "cite",
    "this",
    "that",
    "these",
    "those",
    "when",
    "into",
    "your",
    "their",
    "about",
  ]);

  return new Set(Array.from(tokens).filter((token) => !stopWords.has(token)));
}

function extractLeafSectionHeading(sectionPath: string, sectionId: string): string {
  const leafSegment = sectionPath.split(" > ").at(-1)?.trim() ?? sectionPath.trim();
  if (leafSegment.toLowerCase().startsWith(sectionId.toLowerCase())) {
    return leafSegment.slice(sectionId.length).replace(/^[:\-\s]+/, "").trim();
  }
  return leafSegment;
}
