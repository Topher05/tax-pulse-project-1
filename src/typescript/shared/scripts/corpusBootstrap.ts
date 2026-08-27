import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

import {
  createOpenAIEmbeddingProvider,
  rebuildCorpusEmbeddings,
} from "../../assist/embeddings.js";
import { readCorpusChunkArtifact } from "../../assist/corpus.js";

loadEnv({ override: true });

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const chunksPath = process.env.CORPUS_CHUNKS_PATH?.trim();
if (!chunksPath) {
  throw new Error("CORPUS_CHUNKS_PATH is required");
}

const chunks = await readCorpusChunkArtifact(chunksPath);
const provider = createOpenAIEmbeddingProvider();
const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();
  const records = await rebuildCorpusEmbeddings(drizzle(client) as never, chunks, provider);
  console.log(
    `PASS Bootstrapped ${records.length} corpus chunk(s) from ${chunksPath} using ${records[0]?.embeddingModel ?? "no model"}.`,
  );
} finally {
  await client.end();
}
