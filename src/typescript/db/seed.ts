import { drizzle } from "drizzle-orm/node-postgres";
import { fileURLToPath } from "node:url";
import type { Client } from "pg";

import {
  applyDrizzleMigrations,
  getDatabaseUrlFromEnv,
  withDatabaseClient,
} from "../postgresMigrations.js";

import {
  credential,
  mfaEnrollment,
  roles,
  stageTransition,
  taxPlanCycle,
  tenants,
  userStatus,
  users,
} from "./schema.js";

import {
  buildTaxPlanCycleInsertRows,
  credentialRows,
  mfaEnrollmentRows,
  roleRows,
  stageTransitionRows,
  taxPlanCycleRows,
  tenantRows,
  userRows,
  userStatusRows,
} from "./seed.model.js";

export async function applySeed(client: Client): Promise<void> {
  const db = drizzle(client);

  await client.query("BEGIN");

  try {
    await client.query(`
      TRUNCATE TABLE
        "audit_entry",
        "stage_transition",
        "tax_plan_cycle",
        "mfa_enrollment",
        "credential",
        "users",
        "user_status",
        "roles",
        "tenants"
      RESTART IDENTITY CASCADE
    `);

    await db.insert(tenants).values([...tenantRows]);
    await db.insert(roles).values([...roleRows]);
    await db.insert(userStatus).values([...userStatusRows]);
    await db.insert(users).values([...userRows]);
    await db.insert(credential).values([...credentialRows]);
    await db.insert(mfaEnrollment).values([...mfaEnrollmentRows]);
    await db.insert(taxPlanCycle).values(buildTaxPlanCycleInsertRows());
    await db.insert(stageTransition).values([...stageTransitionRows]);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function main(): Promise<void> {
  const databaseUrl = getDatabaseUrlFromEnv();

  await withDatabaseClient(databaseUrl, async (client) => {
    await client.query(`DROP SCHEMA IF EXISTS public CASCADE`);
    await client.query(`CREATE SCHEMA public`);
    await applyDrizzleMigrations(client);
    await applySeed(client);
  });
  console.log("Applied linear seed data");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.info('Failed seed')
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
