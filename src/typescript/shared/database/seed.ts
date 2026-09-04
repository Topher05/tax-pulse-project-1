import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

import { migrateDatabase } from "./migrate.js";

import {
  actionItem,
  clientRoster,
  auditEntry,
  credential,
  deduction,
  incomeEvent,
  federalTaxBracket,
  mfaEnrollment,
  roles,
  stageTransition,
  stateTaxBracket,
  taxpayerIdentifierValidation,
  taxPlanCycle,
  tenants,
  userStatus,
  users,
} from "./schema.js";

import {
  buildActionItemInsertRows,
  auditEntryRows,
  buildTaxPlanCycleInsertRows,
  californiaTaxBracketRows,
  clientRosterRows,
  credentialRows,
  deductionRows,
  incomeEventRows,
  federalTaxBracketRows,
  mfaEnrollmentRows,
  roleRows,
  stageTransitionRows,
  taxPlanCycleRows,
  tenantRows,
  userRows,
  userStatusRows,
} from "./seed.model.js";

loadEnv();

export async function applySeed(client: Client): Promise<void> {
  const db = drizzle(client);

  await client.query("BEGIN");

  try {
    await client.query(`
      TRUNCATE TABLE
        "audit_entry",
        "action_item",
        "taxpayer_identifier_validation",
        "scenario",
        "income_event",
        "deduction",
        "stage_transition",
        "client_roster",
        "tax_plan_cycle",
        "state_tax_bracket",
        "federal_tax_bracket",
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
    await db.insert(actionItem).values(buildActionItemInsertRows());
    await db.insert(taxpayerIdentifierValidation).values([
      {
        caseId: taxPlanCycleRows[1].id,
        tenantId: taxPlanCycleRows[1].tenantId,
        tinType: "ein",
        validationResult: "match",
        verifiedName: "ACME GOVERNMENT SERVICES LLC",
        provider: "tivs",
        validatedAt: new Date("2026-07-21T14:00:00.000Z"),
      },
    ]);
    await db.insert(clientRoster).values([...clientRosterRows]);
    await db.insert(deduction).values([...deductionRows]);
    await db.insert(incomeEvent).values([...incomeEventRows]);
    await db.insert(stageTransition).values([...stageTransitionRows]);
    await db.insert(auditEntry).values([...auditEntryRows]);
    await db.insert(federalTaxBracket).values([...federalTaxBracketRows]);
    await db.insert(stateTaxBracket).values([...californiaTaxBracketRows]);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Copy .env.example to .env and set DATABASE_URL.",
    );
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    await client.query(`DROP SCHEMA IF EXISTS public CASCADE`);
    await client.query(`CREATE SCHEMA public`);
    await migrateDatabase(client);
    await applySeed(client);
  } finally {
    await client.end();
  }

  console.log("Applied linear seed data");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.info("Failed seed");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
