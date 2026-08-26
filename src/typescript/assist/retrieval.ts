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
      
      const ranked = candidates.map((candidate) => {
        let rerankScore = candidate.hybridScore;
        const pathTokens = tokenize(candidate.sectionPath);
        
        if (queryTokens.size > 0 && Array.from(queryTokens).every((t) => pathTokens.has(t))) {
          rerankScore += 1.0;
        }

        const idTokens = tokenize(candidate.sectionId.replace(/-/g, " "));
        if (queryTokens.size > 0 && Array.from(idTokens).some((t) => queryTokens.has(t))) {
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
    const pathTokens = tokenize(candidate.sectionPath);
    const titleTokens = tokenize(candidate.citation.documentTitle);

    let keywordRawScore = 0;
    for (const token of queryTokens) {
      if (textTokens.has(token)) {
        keywordRawScore += 1;
      }
      if (pathTokens.has(token)) {
        keywordRawScore += 2;
      }
      if (titleTokens.has(token)) {
        keywordRawScore += 2;
      }
    }

    const maxPossibleKeywordScore = queryTokens.size * 5;
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
  if (queryTokens.size === 0) {
    return [];
  }

  const rows = await db.select().from(aiAssistCorpusEmbedding).limit(Math.max(0, limit) * 10);
  const scoredRows = rows.map((row) => {
    const textTokens = tokenize(row.text);
    const pathTokens = tokenize(row.sectionPath);
    const citation = row.citation as CorpusCitation;
    const titleTokens = tokenize(citation.documentTitle ?? "");

    let keywordRawScore = 0;
    for (const token of queryTokens) {
      if (textTokens.has(token)) {
        keywordRawScore += 1;
      }
      if (pathTokens.has(token)) {
        keywordRawScore += 2;
      }
      if (titleTokens.has(token)) {
        keywordRawScore += 2;
      }
    }

    return {
      ...row,
      documentType: row.documentType as CorpusDocumentType,
      citation,
      similarity: Math.max(0, Math.min(1, keywordRawScore / Math.max(1, queryTokens.size * 5))),
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
    .slice(0, limit);
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((token) => token.length > 2) ?? [],
  );
}
