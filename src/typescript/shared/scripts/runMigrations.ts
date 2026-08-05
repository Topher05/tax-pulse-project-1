import { fileURLToPath } from "node:url";

import {
  applyDrizzleMigrations,
  getDatabaseUrlFromEnv,
  withDatabaseClient,
} from "./drizzleMigrations.js";

export async function main(): Promise<void> {
  const databaseUrl = getDatabaseUrlFromEnv();

  await withDatabaseClient(databaseUrl, async (client) => {
    await applyDrizzleMigrations(client);
  });

  console.log("Applied PostgreSQL migrations from drizzle-migrations/");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
