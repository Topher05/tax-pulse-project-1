// Deprecated: manual SQL migration runner kept for compatibility while the
// Drizzle migration flow remains the primary path.
import { fileURLToPath } from "node:url";

import {
  applyMigrations,
  getDatabaseUrlFromEnv,
  withDatabaseClient,
} from "./postgresMigrations.js";

export async function main(): Promise<void> {
  const databaseUrl = getDatabaseUrlFromEnv();

  await withDatabaseClient(databaseUrl, async (client) => {
    await applyMigrations(client);
  });

  console.log("Applied PostgreSQL migrations from migrations/");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
