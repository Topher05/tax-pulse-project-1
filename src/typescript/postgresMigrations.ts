import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();

export const migrationsDirectory = resolve(repoRoot, "migrations");
const migrationNamePattern = /^\d{14}_[a-z0-9][a-z0-9_-]*\.sql$/;

export function isPsqlAvailable(): boolean {
  const result = spawnSync("psql", ["--version"], { encoding: "utf8" });

  return result.error === undefined && result.status === 0;
}

export function listMigrationFiles(
  migrationsDir: string = migrationsDirectory,
): string[] {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => {
      if (!migrationNamePattern.test(fileName)) {
        throw new Error(
          `Invalid migration file name "${fileName}". ` +
            "Use YYYYMMDDHHMMSS_description.sql.",
        );
      }

      return resolve(migrationsDir, fileName);
    });
}

export function runPsqlScript(databaseUrl: string, sql: string): string {
  const result = spawnSync(
    "psql",
    [
      "--no-psqlrc",
      "--quiet",
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
      "--dbname",
      databaseUrl,
    ],
    {
      encoding: "utf8",
      input: sql,
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  if (result.error) {
    throw new Error(`Failed to run psql: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(
      `psql exited with code ${result.status}: ${result.stderr.trim()}`,
    );
  }

  return result.stdout.trim();
}

export function applyMigrations(
  databaseUrl: string,
  options: {
    migrationsDir?: string;
    preludeSql?: string;
  } = {},
): void {
  const migrations = listMigrationFiles(options.migrationsDir);
  const scriptParts: string[] = [];

  if (options.preludeSql?.trim()) {
    scriptParts.push(options.preludeSql.trim());
  }

  for (const migrationFile of migrations) {
    scriptParts.push(readFileSync(migrationFile, "utf8").trim());
  }

  if (scriptParts.length === 0) {
    throw new Error(`No SQL migrations found in ${migrationsDirectory}`);
  }

  runPsqlScript(databaseUrl, scriptParts.join("\n\n"));
}
