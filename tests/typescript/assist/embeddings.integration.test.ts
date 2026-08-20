import { describe, expect, test } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";

import {
  corpusEmbeddingDimensions,
  rebuildCorpusEmbeddings,
  retrieveSimilarCorpusChunks,
  type EmbeddingProvider,
} from "../../../src/typescript/assist/embeddings.js";
import type { CorpusChunk } from "../../../src/typescript/assist/corpus.js";
import { withDockerDrizzleSeededDatabase } from "../bootstrap/migrationTestUtils.js";

const vector = (value: number): number[] =>
  Array.from({ length: corpusEmbeddingDimensions }, (_, index) => (index === 0 ? value : 0));

const chunk = (chunkId: string): CorpusChunk => ({
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
  text: `rule ${chunkId} about quarterly estimated payments`,
  ordinal: 1,
  contentHash: `hash-${chunkId}`,
});

describe("assist corpus embeddings against pgvector", () => {
  test("migrates the vector index and executes similarity retrieval", async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const extension = await client.query<{ installed: string }>(
        "SELECT extname AS installed FROM pg_extension WHERE extname = 'vector'",
      );
      const index = await client.query<{ indexname: string }>(
        "SELECT indexname FROM pg_indexes WHERE indexname = 'ai_assist_corpus_embedding_embedding_hnsw_idx'",
      );
      expect(extension.rows.map((row) => row.installed)).toContain("vector");
      expect(index.rows.map((row) => row.indexname)).toContain(
        "ai_assist_corpus_embedding_embedding_hnsw_idx",
      );

      const database = drizzle(client);
      const provider: EmbeddingProvider = {
        embed: async (inputs) =>
          inputs.map((input) =>
            input.startsWith("quarterly") || input.startsWith("rule")
              ? vector(1)
              : vector(0.1),
          ),
      };

      await rebuildCorpusEmbeddings(database as never, [chunk("rule"), chunk("other")], provider);
      const results = await retrieveSimilarCorpusChunks(
        database as never,
        "quarterly estimated payments",
        1,
        provider,
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        chunkId: "rule",
        citation: chunk("rule").citation,
      });
    });
  });
});
