import OpenAI from "openai";
import { asc, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  aiAssistCorpusEmbedding,
} from "../shared/database/schema.js";
import type { CorpusChunk, CorpusCitation } from "./corpus.js";

export const corpusEmbeddingModel = "text-embedding-3-small";
export const corpusEmbeddingDimensions = 1536;

export interface EmbeddingProvider {
  embed(input: readonly string[]): Promise<readonly (readonly number[])[]>;
}

export interface CorpusEmbeddingRecord {
  chunkId: string;
  documentId: string;
  documentType: CorpusChunk["documentType"];
  sectionId: string;
  sectionPath: string;
  text: string;
  contentHash: string;
  ordinal: number;
  citation: CorpusCitation;
  embeddingModel: string;
  embedding: number[];
}

export interface SimilarCorpusChunk extends CorpusEmbeddingRecord {
  similarity: number;
}

export function createOpenAIEmbeddingProvider(
  apiKey = process.env.OPENAI_API_KEY?.trim(),
): EmbeddingProvider {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required to create an embedding provider.");
  }

  const client = new OpenAI({ apiKey });

  return {
    async embed(input) {
      const response = await client.embeddings.create({
        model: corpusEmbeddingModel,
        input: [...input],
      });

      return response.data
        .sort((left, right) => left.index - right.index)
        .map((item) => item.embedding);
    },
  };
}

export async function rebuildCorpusEmbeddings(
  db: NodePgDatabase<Record<string, unknown>>,
  chunks: readonly CorpusChunk[],
  provider: EmbeddingProvider,
): Promise<CorpusEmbeddingRecord[]> {
  const orderedChunks = [...chunks].sort((left, right) =>
    left.chunkId.localeCompare(right.chunkId),
  );
  const embeddings = await provider.embed(orderedChunks.map((chunk) => chunk.text));

  if (embeddings.length !== orderedChunks.length) {
    throw new Error(
      `Embedding provider returned ${embeddings.length} vectors for ${orderedChunks.length} chunks.`,
    );
  }

  const records = orderedChunks.map((chunk, index) => {
    const embedding = [...(embeddings[index] ?? [])];
    validateEmbedding(embedding, `chunk ${chunk.chunkId}`);

    return {
      chunkId: chunk.chunkId,
      documentId: chunk.documentId,
      documentType: chunk.documentType,
      sectionId: chunk.sectionId,
      sectionPath: chunk.sectionPath,
      text: chunk.text,
      contentHash: chunk.contentHash,
      ordinal: chunk.ordinal,
      citation: chunk.citation,
      embeddingModel: corpusEmbeddingModel,
      embedding,
    } satisfies CorpusEmbeddingRecord;
  });

  await db.transaction(async (transaction) => {
    await transaction.delete(aiAssistCorpusEmbedding);

    if (records.length > 0) {
      await transaction.insert(aiAssistCorpusEmbedding).values(records);
    }
  });

  return records;
}

export async function retrieveSimilarCorpusChunks(
  db: NodePgDatabase<Record<string, unknown>>,
  query: string,
  limit: number,
  provider: EmbeddingProvider,
): Promise<SimilarCorpusChunk[]> {
  if (!query.trim()) {
    throw new Error("A non-empty query is required for corpus retrieval.");
  }

  const resultLimit = Math.max(0, Math.floor(limit));
  if (resultLimit === 0) {
    return [];
  }

  const [queryEmbedding] = await provider.embed([query]);
  const vector = [...(queryEmbedding ?? [])];
  validateEmbedding(vector, "query");
  const vectorParameter = vectorToSqlParameter(vector);
  const distance = sql<number>`${aiAssistCorpusEmbedding.embedding} <=> ${vectorParameter}::vector`;

  const rows = await db
    .select({
      chunkId: aiAssistCorpusEmbedding.chunkId,
      documentId: aiAssistCorpusEmbedding.documentId,
      documentType: aiAssistCorpusEmbedding.documentType,
      sectionId: aiAssistCorpusEmbedding.sectionId,
      sectionPath: aiAssistCorpusEmbedding.sectionPath,
      text: aiAssistCorpusEmbedding.text,
      contentHash: aiAssistCorpusEmbedding.contentHash,
      ordinal: aiAssistCorpusEmbedding.ordinal,
      citation: aiAssistCorpusEmbedding.citation,
      embeddingModel: aiAssistCorpusEmbedding.embeddingModel,
      embedding: aiAssistCorpusEmbedding.embedding,
      similarity: sql<number>`1 - (${distance})`,
    })
    .from(aiAssistCorpusEmbedding)
    .orderBy(asc(distance), asc(aiAssistCorpusEmbedding.chunkId))
    .limit(resultLimit);

  return rows.map((row) => ({
    ...row,
    documentType: row.documentType as CorpusChunk["documentType"],
    citation: row.citation as CorpusCitation,
    embedding: [...row.embedding],
    similarity: Number(row.similarity),
  }));
}

function validateEmbedding(embedding: readonly number[], label: string): void {
  if (
    embedding.length !== corpusEmbeddingDimensions ||
    embedding.some((value) => !Number.isFinite(value))
  ) {
    throw new Error(
      `${label} embedding must contain ${corpusEmbeddingDimensions} finite numeric values.`,
    );
  }
}

function vectorToSqlParameter(vector: readonly number[]): string {
  return `[${vector.join(",")}]`;
}
