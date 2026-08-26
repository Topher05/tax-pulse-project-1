import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { retrieveHybridCorpusChunks } from "../../assist/retrieval.js";
import { createOpenAIEmbeddingProvider } from "../../assist/embeddings.js";
import { assertComposePostgresReady } from "./composePostgres.js";

async function main() {
  loadEnv({ override: true });
  console.log("Starting hybrid retrieval smoke test...");

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required");
  }

  const { connectionString: databaseUrl, endpoint } = assertComposePostgresReady();

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const db = drizzle(client) as never;
  const provider = createOpenAIEmbeddingProvider();

  const query =
    process.env.CORPUS_HYBRID_SMOKE_QUERY?.trim() ||
    "For a single filer, what safe-harbor threshold should be cited?";
  const expectedSectionId =
    process.env.CORPUS_HYBRID_SMOKE_EXPECTED_SECTION_ID?.trim() || "SYN-TC-4110-b";

  console.log(`Query: "${query}"`);
  console.log(`Compose Postgres endpoint: ${endpoint}`);

  const candidates = await retrieveHybridCorpusChunks(
    db,
    query,
    { limit: 3 },
    provider,
  );

  console.log(`\nRetrieved top ${candidates.length} candidates:\n`);

  if (candidates.length === 0) {
    throw new Error("Hybrid smoke returned no candidates.");
  }

  candidates.forEach((chunk, i) => {
    console.log(`Rank ${i + 1}: ${chunk.chunkId}`);
    console.log(`Section Path: ${chunk.sectionPath}`);
    console.log(`Hybrid Score: ${chunk.hybridScore.toFixed(4)}`);
    console.log(`Rerank Score: ${chunk.rerankScore.toFixed(4)}`);
    console.log(`Vector Score: ${chunk.vectorScore.toFixed(4)}`);
    console.log(`Keyword Score: ${chunk.keywordScore.toFixed(4)}`);
    console.log(`Text snippet: ${chunk.text.substring(0, 100)}...`);
    console.log("---");
  });

  const topResult = candidates[0];
  if (!topResult || topResult.sectionId !== expectedSectionId) {
    throw new Error(
      `Hybrid smoke expected ${expectedSectionId} first, received ${topResult?.sectionId ?? "none"}.`,
    );
  }

  console.log("Smoke test completed.");
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
