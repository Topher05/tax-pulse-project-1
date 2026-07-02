import { config as loadEnv } from "dotenv";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

loadEnv();

const repoRoot = process.cwd();

export const migrationsDirectory = resolve(repoRoot, "migrations");
const migrationNamePattern = /^\d{14}_[a-z0-9][a-z0-9_-]*\.sql$/;

export function getDatabaseUrlFromEnv(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Copy .env.example to .env and set DATABASE_URL.",
    );
  }

  return databaseUrl;
}

export function listMigrationFiles(
  migrationsDir: string = migrationsDirectory,
): string[] {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => {
      console.log(fileName)
      if (!migrationNamePattern.test(fileName)) {
        throw new Error(
          `Invalid migration file name "${fileName}". ` +
            "Use YYYYMMDDHHMMSS_description.sql.",
        );
      }

      return resolve(migrationsDir, fileName);
    });
}

export async function withDatabaseClient<T>(
  databaseUrl: string,
  callback: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString: databaseUrl });

  await client.connect();

  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

export async function applyMigrations(client: Client): Promise<void> {
  const migrationFiles = listMigrationFiles();

  if (migrationFiles.length === 0) {
    throw new Error(`No SQL migrations found in ${migrationsDirectory}`);
  }

  for (const migrationFile of migrationFiles) {
    const migrationSql = readFileSync(migrationFile, "utf8").trim();

    if (!migrationSql) {
      continue;
    }
    console.log(migrationSql)
    await client.query(migrationSql);
  }
}
