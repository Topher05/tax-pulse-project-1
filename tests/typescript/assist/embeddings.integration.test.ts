import { describe, expect, test } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";

import {
  corpusEmbeddingDimensions,
  rebuildCorpusEmbeddings,
  retrieveSimilarCorpusChunks,
  type EmbeddingProvider,
} from "../../../src/typescript/assist/embeddings.js";
import {
  defaultCorpusChunkArtifactPath,
  readCorpusChunkArtifact,
} from "../../../src/typescript/assist/corpus.js";
import { withDockerDrizzleSeededDatabase } from "../bootstrap/migrationTestUtils.js";

const vector = (value: number): number[] =>
  Array.from({ length: corpusEmbeddingDimensions }, (_, index) => (index === 0 ? value : 0));

describe("assist corpus embeddings against pgvector", () => {
  test("migrates the vector index and executes similarity retrieval", async () => {
    const chunks = await readCorpusChunkArtifact(defaultCorpusChunkArtifactPath);
    expect(chunks.length).toBeGreaterThan(0);

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
            input.startsWith("quarterly") || input.includes("For retrieval testing")
              ? vector(1)
              : vector(0.1),
          ),
      };

      await rebuildCorpusEmbeddings(database as never, chunks, provider);
      const firstCount = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM "ai_assist_corpus_embedding"',
      );
      expect(Number(firstCount.rows[0]?.count)).toBe(chunks.length);

      const firstIds = await client.query<{ chunk_id: string }>(
        'SELECT chunk_id FROM "ai_assist_corpus_embedding" ORDER BY chunk_id',
      );
      expect(firstIds.rows.map((row) => row.chunk_id)).toEqual(
        chunks
          .map((chunk) => chunk.chunkId)
          .sort((left, right) => left.localeCompare(right)),
      );

      await rebuildCorpusEmbeddings(database as never, chunks, provider);
      const repeatCount = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM "ai_assist_corpus_embedding"',
      );
      expect(Number(repeatCount.rows[0]?.count)).toBe(chunks.length);

      await rebuildCorpusEmbeddings(database as never, chunks.slice(0, 1), provider);
      const staleRemovalCount = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM "ai_assist_corpus_embedding"',
      );
      expect(Number(staleRemovalCount.rows[0]?.count)).toBe(1);

      await rebuildCorpusEmbeddings(database as never, chunks, provider);
      const results = await retrieveSimilarCorpusChunks(
        database as never,
        "quarterly estimated payments",
        1,
        provider,
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        sectionId: "SYN-TC-4100-b",
      });
    });
  });
});
