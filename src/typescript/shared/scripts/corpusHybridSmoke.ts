import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { retrieveHybridCorpusChunks } from "../../assist/retrieval.js";
import { createOpenAIEmbeddingProvider } from "../../assist/embeddings.js";

async function main() {
  loadEnv();
  console.log("Starting hybrid retrieval smoke test...");

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required");
  }
  
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const db = drizzle(client) as never;
  const provider = createOpenAIEmbeddingProvider();

  const query = "What are the limits on home office deduction?";

  console.log(`Query: "${query}"`);

  const candidates = await retrieveHybridCorpusChunks(
    db,
    query,
    { limit: 3 },
    provider,
  );

  console.log(`\nRetrieved top ${candidates.length} candidates:\n`);

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

  console.log("Smoke test completed.");
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
