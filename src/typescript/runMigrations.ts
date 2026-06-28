import { applyMigrations, isPsqlAvailable } from "./postgresMigrations.js";
import { fileURLToPath } from "node:url";

export function main(): void {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is required to run migrations.");
    process.exitCode = 1;
    return;
  }

  if (!isPsqlAvailable()) {
    console.error("psql is required on PATH to run migrations.");
    process.exitCode = 1;
    return;
  }

  applyMigrations(databaseUrl);
  console.log("Applied PostgreSQL migrations from migrations/");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
