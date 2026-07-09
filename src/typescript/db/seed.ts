import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import type { Client } from "pg";

import {
  getDatabaseUrlFromEnv,
  withDatabaseClient,
} from "../postgresMigrations.js";
import {
  roles,
  stageTransition,
  taxPlanCycle,
  tenants,
  userStatus,
  users,
} from "./schema.js";
import {
  buildTaxPlanCycleInsertRows,
  roleRows,
  stageTransitionRows,
  taxPlanCycleRows,
  tenantRows,
  userRows,
  userStatusRows,
} from "./seed.model.js";

export async function applySeed(client: Client): Promise<void> {
  const db = drizzle(client);

  await db.delete(stageTransition);
  await db.delete(taxPlanCycle);
  await db.delete(users);
  await db.delete(userStatus);
  await db.delete(roles);
  await db.delete(tenants);

  await db.insert(tenants).values([...tenantRows]);
  await db.insert(roles).values([...roleRows]);
  await db.insert(userStatus).values([...userStatusRows]);
  await db.insert(users).values([...userRows]);
  await db.insert(taxPlanCycle).values(buildTaxPlanCycleInsertRows());
  await db.insert(stageTransition).values([...stageTransitionRows]);

  await db.execute(
    sql`
      SELECT setval(
        pg_get_serial_sequence('roles', 'id'),
        (SELECT COALESCE(MAX(id), 1) FROM roles),
        true
      )
    `,
  );
  await db.execute(
    sql`
      SELECT setval(
        pg_get_serial_sequence('user_status', 'id'),
        (SELECT COALESCE(MAX(id), 1) FROM user_status),
        true
      )
    `,
  );
}

export async function main(): Promise<void> {
  const databaseUrl = getDatabaseUrlFromEnv();

  await withDatabaseClient(databaseUrl, async (client) => {
    await applySeed(client);
  });

  console.log("Applied linear seed data");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
        console.info('Failed seed') // Comment from me dont remove for now

    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
