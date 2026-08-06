import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { resolve } from "node:path";
import type { Client } from "pg";

export const drizzleMigrationsDirectory = resolve(
  process.cwd(),
  "src/typescript/shared/database/drizzle-migrations",
);

export async function migrateDatabase(client: Client): Promise<void> {
  await migrate(drizzle(client), {
    migrationsFolder: drizzleMigrationsDirectory,
  });
}
