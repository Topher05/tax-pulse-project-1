import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

import {
  getDatabaseUrlFromEnv,
  withDatabaseClient,
} from "./postgresMigrations.js";

const repoRoot = process.cwd();
const seedFilePath = resolve(repoRoot, "seed.sql");

export async function applySeed(client: Client): Promise<void> {
  const seedSql = readFileSync(seedFilePath, "utf8").trim();

  if (!seedSql) {
    throw new Error(`No SQL found in ${seedFilePath}`);
  }

  await client.query(seedSql);
}

export async function main(): Promise<void> {
  const databaseUrl = getDatabaseUrlFromEnv();

  await withDatabaseClient(databaseUrl, async (client) => {
    await applySeed(client);
  });

  console.log("Applied seed.sql");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
