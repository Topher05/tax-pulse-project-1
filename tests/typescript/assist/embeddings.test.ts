import { describe, expect, test } from "vitest";

import {
  corpusEmbeddingDimensions,
  corpusEmbeddingModel,
  rebuildCorpusEmbeddings,
  retrieveSimilarCorpusChunks,
  type EmbeddingProvider,
} from "../../../src/typescript/assist/embeddings.js";
import type { CorpusChunk } from "../../../src/typescript/assist/corpus.js";

const embedding = (value: number): number[] =>
  Array.from({ length: corpusEmbeddingDimensions }, (_, index) =>
    index === 0 ? value : 0,
  );

function chunk(chunkId: string, ordinal: number): CorpusChunk {
  return {
    chunkId,
    documentId: "syn-tc-4100",
    documentType: "tax_code",
    sectionId: "SYN-TC-4100-b",
    sectionPath: "Estimated Payments > Quarterly Triggers",
    citation: {
      documentTitle: "Synthetic Estimated Payment Triggers",
      documentType: "tax_code",
      fictionalIssuer: "Civic Ledger Training Authority",
      tenantId: "tenant-training-alpha",
      sectionId: "SYN-TC-4100-b",
      sectionPath: "Estimated Payments > Quarterly Triggers",
      syntheticNotice: "Synthetic training content; rates and limits are invented.",
    },
    text: `chunk ${chunkId} about quarterly estimated payments`,
    ordinal,
    contentHash: `hash-${chunkId}`,
  };
}

function fakeDatabase() {
  const inserted: unknown[][] = [];
  const rows: unknown[] = [];

  return {
    inserted,
    rows,
    transaction: async (callback: (transaction: unknown) => Promise<void>) =>
      callback({
        delete: async () => undefined,
        insert: () => ({
          values: async (values: unknown[]) => {
            inserted.push(values);
          },
        }),
      }),
    select: () => ({
      from: () => ({
        orderBy: () => ({
          limit: async () => rows,
        }),
      }),
    }),
  };
}

describe("assist corpus embeddings", () => {
  test("rebuilds embeddings in stable chunk order and preserves corpus metadata", async () => {
    const database = fakeDatabase();
    const chunks = [chunk("b", 2), chunk("a", 1)];
    const provider: EmbeddingProvider = {
      embed: async (inputs) => inputs.map((value) => embedding(value.endsWith("a") ? 1 : 2)),
    };

    const records = await rebuildCorpusEmbeddings(
      database as never,
      chunks,
      provider,
    );

    expect(records.map((record) => record.chunkId)).toEqual(["a", "b"]);
    expect(records[0]).toMatchObject({
      documentId: "syn-tc-4100",
      sectionId: "SYN-TC-4100-b",
      contentHash: "hash-a",
      ordinal: 1,
      embeddingModel: corpusEmbeddingModel,
    });
    expect(database.inserted[0]).toEqual(records);
  });

  test("rejects providers that return vectors with the wrong dimensions", async () => {
    const provider: EmbeddingProvider = {
      embed: async () => [[]],
    };

    await expect(rebuildCorpusEmbeddings(fakeDatabase() as never, [chunk("a", 1)], provider))
      .rejects.toThrow(`embedding must contain ${corpusEmbeddingDimensions} finite numeric values`);
  });

  test("returns vector-ranked chunks with cosine similarity", async () => {
    const database = fakeDatabase();
    database.rows.push({
      chunkId: "a",
      documentId: "syn-tc-4100",
      documentType: "tax_code",
      sectionId: "SYN-TC-4100-b",
      sectionPath: "Estimated Payments > Quarterly Triggers",
      text: "quarterly estimated payments",
      contentHash: "hash-a",
      ordinal: 1,
      citation: chunk("a", 1).citation,
      embeddingModel: corpusEmbeddingModel,
      embedding: embedding(1),
      similarity: "0.98",
    });
    const provider: EmbeddingProvider = {
      embed: async () => [embedding(1)],
    };

    const results = await retrieveSimilarCorpusChunks(
      database as never,
      "quarterly estimated payments",
      3,
      provider,
    );

    expect(results[0]).toMatchObject({ chunkId: "a", similarity: 0.98 });
    expect(results[0]?.embedding).toHaveLength(corpusEmbeddingDimensions);
  });
});
