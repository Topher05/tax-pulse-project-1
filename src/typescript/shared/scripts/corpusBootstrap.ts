import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

import {
  createOpenAIEmbeddingProvider,
  rebuildCorpusEmbeddings,
} from "../../assist/embeddings.js";
import {
  defaultCorpusChunkArtifactPath,
  readCorpusChunkArtifact,
} from "../../assist/corpus.js";

loadEnv({ override: true });

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const chunksPath = process.env.CORPUS_CHUNKS_PATH?.trim() || defaultCorpusChunkArtifactPath;

const chunks = await readCorpusChunkArtifact(chunksPath);
if (chunks.length === 0) {
  throw new Error(`Corpus artifact ${chunksPath} contains no chunks.`);
}
const provider = createOpenAIEmbeddingProvider();
const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();
  const records = await rebuildCorpusEmbeddings(drizzle(client) as never, chunks, provider);
  const expectedScopeCounts = new Map<string, number>();
  for (const record of records) {
    expectedScopeCounts.set(
      record.citation.tenantId,
      (expectedScopeCounts.get(record.citation.tenantId) ?? 0) + 1,
    );
  }
  const verification = await client.query<{ tenant_id: string; count: number }>(
    `SELECT citation->>'tenantId' AS tenant_id, COUNT(*)::int AS count
       FROM "ai_assist_corpus_embedding"
      GROUP BY citation->>'tenantId'`,
  );
  const persistedScopeCounts = new Map(
    verification.rows.map((row) => [row.tenant_id, row.count] as const),
  );
  if (expectedScopeCounts.size === 0 || persistedScopeCounts.size !== expectedScopeCounts.size) {
    throw new Error(
      `Corpus bootstrap verification failed: expected scopes ${JSON.stringify(
        Object.fromEntries(expectedScopeCounts),
      )}, found ${JSON.stringify(Object.fromEntries(persistedScopeCounts))}.`,
    );
  }
  for (const [scope, expectedCount] of expectedScopeCounts) {
    if (persistedScopeCounts.get(scope) !== expectedCount) {
      throw new Error(
        `Corpus bootstrap verification found an incorrect row count for ${scope}: expected ${expectedCount}, found ${persistedScopeCounts.get(scope) ?? 0}.`,
      );
    }
  }
  console.log(
    JSON.stringify({
      event: "assist_corpus_bootstrap_complete",
      chunk_count: records.length,
      tenant_scope_counts: Object.fromEntries(
        [...persistedScopeCounts.entries()].sort(([left], [right]) => left.localeCompare(right)),
      ),
      artifact_path: chunksPath,
      embedding_model: records[0]?.embeddingModel ?? "unknown",
    }),
  );
} finally {
  await client.end();
}
