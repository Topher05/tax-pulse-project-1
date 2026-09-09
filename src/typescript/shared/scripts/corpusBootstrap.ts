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
  const expectedScopes = new Set(records.map((record) => record.citation.tenantId));
  const verification = await client.query<{ tenant_id: string; count: number }>(
    `SELECT citation->>'tenantId' AS tenant_id, COUNT(*)::int AS count
       FROM "ai_assist_corpus_embedding"
      GROUP BY citation->>'tenantId'`,
  );
  const persistedScopes = new Set(
    verification.rows.filter((row) => row.count > 0).map((row) => row.tenant_id),
  );
  const persistedCount = verification.rows.reduce((total, row) => total + row.count, 0);
  if (persistedCount !== records.length || expectedScopes.size === 0) {
    throw new Error(
      `Corpus bootstrap verification failed: expected ${records.length} row(s), found ${persistedCount}.`,
    );
  }
  for (const scope of expectedScopes) {
    if (!persistedScopes.has(scope)) {
      throw new Error(`Corpus bootstrap verification found no persisted rows for ${scope}.`);
    }
  }
  console.log(
    JSON.stringify({
      event: "assist_corpus_bootstrap_complete",
      chunk_count: records.length,
      tenant_scopes: [...persistedScopes].sort(),
      artifact_path: chunksPath,
      embedding_model: records[0]?.embeddingModel ?? "unknown",
    }),
  );
} finally {
  await client.end();
}
