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
  let requestedLimit: number | undefined;

  return {
    inserted,
    rows,
    get requestedLimit() {
      return requestedLimit;
    },
    transaction: async (callback: (transaction: unknown) => Promise<void>) =>
      callback({
        delete: async () => {
          inserted.length = 0;
        },
        insert: () => ({
          values: async (values: unknown[]) => {
            inserted.push(values);
          },
        }),
      }),
    select: () => ({
      from: () => ({
        orderBy: () => ({
          limit: async (limit: number) => {
            requestedLimit = limit;
            return rows.slice(0, limit);
          },
        }),
      }),
    }),
  };
}

describe("assist corpus embeddings", () => {
  test("rebuilds embeddings in stable chunk order and preserves corpus metadata", async () => {
    const database = fakeDatabase();
    const chunks = [chunk("b", 2), chunk("a", 1)];
    const inputs: string[][] = [];
    const provider: EmbeddingProvider = {
      embed: async (values) => {
        inputs.push([...values]);
        return values.map((value) => embedding(value.endsWith("a") ? 1 : 2));
      },
    };

    const records = await rebuildCorpusEmbeddings(
      database as never,
      chunks,
      provider,
    );

    expect(records.map((record) => record.chunkId)).toEqual(["a", "b"]);
    expect(inputs).toEqual([
      ["chunk a about quarterly estimated payments", "chunk b about quarterly estimated payments"],
    ]);
    expect(records[0]).toMatchObject({
      documentId: "syn-tc-4100",
      sectionId: "SYN-TC-4100-b",
      contentHash: "hash-a",
      ordinal: 1,
      embeddingModel: corpusEmbeddingModel,
      citation: chunk("a", 1).citation,
      text: "chunk a about quarterly estimated payments",
    });
    expect(database.inserted[0]).toEqual(records);
  });

  test("rebuilding is deterministic and removes stale records", async () => {
    const database = fakeDatabase();
    const provider: EmbeddingProvider = {
      embed: async (values) => values.map(() => embedding(1)),
    };
    const artifact = [chunk("b", 2), chunk("a", 1)];

    const first = await rebuildCorpusEmbeddings(database as never, artifact, provider);
    const repeat = await rebuildCorpusEmbeddings(database as never, artifact, provider);
    const staleRemoved = await rebuildCorpusEmbeddings(database as never, [artifact[0]!], provider);

    expect(repeat).toEqual(first);
    expect(staleRemoved.map((record) => record.chunkId)).toEqual(["b"]);
    expect(database.inserted[0]).toEqual(staleRemoved);
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
    database.rows.push(
      ...["a", "b", "c"].map((chunkId, index) => ({
        chunkId,
        documentId: "syn-tc-4100",
        documentType: "tax_code",
        sectionId: "SYN-TC-4100-b",
        sectionPath: "Estimated Payments > Quarterly Triggers",
        text: "quarterly estimated payments",
        contentHash: `hash-${chunkId}`,
        ordinal: index + 1,
        citation: chunk(chunkId, index + 1).citation,
        embeddingModel: corpusEmbeddingModel,
        embedding: embedding(1),
        similarity: String(0.98 - index / 100),
      })),
    );
    const provider: EmbeddingProvider = {
      embed: async () => [embedding(1)],
    };

    const results = await retrieveSimilarCorpusChunks(
      database as never,
      "quarterly estimated payments",
      2,
      provider,
    );

    expect(results.map(({ chunkId, similarity }) => ({ chunkId, similarity }))).toEqual([
      { chunkId: "a", similarity: 0.98 },
      { chunkId: "b", similarity: 0.97 },
    ]);
    expect(results[0]?.embedding).toHaveLength(corpusEmbeddingDimensions);
    expect(results).toHaveLength(2);
    expect(database.requestedLimit).toBe(2);
    expect(results[0]?.citation).toEqual(chunk("a", 1).citation);
  });

  test("rejects query providers that return zero or multiple vectors", async () => {
    const invalidQueryResponses: readonly (readonly number[])[][] = [
      [],
      [embedding(1), embedding(2)],
    ];

    for (const queryEmbeddings of invalidQueryResponses) {
      const provider: EmbeddingProvider = {
        embed: async () => queryEmbeddings,
      };

      await expect(
        retrieveSimilarCorpusChunks(fakeDatabase() as never, "estimated payments", 1, provider),
      ).rejects.toThrow(
        `Embedding provider returned ${queryEmbeddings.length} vectors for 1 query.`,
      );
    }
  });
});
