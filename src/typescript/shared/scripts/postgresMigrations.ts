import { config as loadEnv } from "dotenv";
import { readFileSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { Client } from "pg";

loadEnv();

const repoRoot = process.cwd();

export const migrationsDirectory = resolve(repoRoot, "migrations");
export const drizzleMigrationsDirectory = resolve(
  repoRoot,
  "src/typescript/shared/database/drizzle-migrations",
);
const migrationNamePattern = /^\d{14}_[a-z0-9][a-z0-9_-]*\.sql$/;
export const appliedMigrationsTableName = "schema_migrations";
export const drizzleAppliedMigrationsTableName = "drizzle_schema_migrations";

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
  options: { validateNames?: boolean } = {},
): string[] {
  const validateNames = options.validateNames ?? true;

  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => {
      if (validateNames && !migrationNamePattern.test(fileName)) {
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

// Deprecated: this legacy migration path exists for compatibility with older
// hand-written migrations. Prefer `applyDrizzleMigrations` for new work.
export async function applyMigrations(client: Client): Promise<void> {
  const migrationFiles = listMigrationFiles(migrationsDirectory);

  if (migrationFiles.length === 0) {
    throw new Error(`No SQL migrations found in ${migrationsDirectory}`);
  }

  await applySqlMigrations(client, migrationFiles, appliedMigrationsTableName);
}

export async function applyDrizzleMigrations(client: Client): Promise<void> {
  const migrationFiles = listMigrationFiles(drizzleMigrationsDirectory, {
    validateNames: false,
  });

  if (migrationFiles.length === 0) {
    throw new Error(
      `No SQL migrations found in ${drizzleMigrationsDirectory}`,
    );
  }

  await applySqlMigrations(
    client,
    migrationFiles,
    drizzleAppliedMigrationsTableName,
  );
}

async function applySqlMigrations(
  client: Client,
  migrationFiles: string[],
  appliedMigrationsTable: string,
): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${appliedMigrationsTable} (
      file_name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const migrationFile of migrationFiles) {
    const fileName = basename(migrationFile);

    const appliedResult = await client.query(
      `
        SELECT 1
        FROM ${appliedMigrationsTable}
        WHERE file_name = $1
      `,
      [fileName],
    );

    if (appliedResult.rowCount !== null && appliedResult.rowCount > 0) {
      continue;
    }

    const migrationSql = readFileSync(migrationFile, "utf8").trim();

    if (!migrationSql) {
      continue;
    }

    await client.query("BEGIN");

    try {
      await client.query(migrationSql);
      await client.query(
        `
          INSERT INTO ${appliedMigrationsTable} (file_name)
          VALUES ($1)
        `,
        [fileName],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}
