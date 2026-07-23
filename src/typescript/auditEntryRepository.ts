import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import {
  auditEntry as auditEntryTable,
  taxPlanCycle as taxPlanCycleTable,
} from "./db/schema.js";
import {
  serializeAuditEntryForOutput,
  type AuditEntryOutput,
} from "./auditEntryOutput.js";

export interface AuditEntryListInput {
  tenantId: string;
  caseId: string;
}

export interface AuditEntryWriteInput {
  caseId: string;
  actor: string;
  action: string;
  outcome: string;
  occurredAt: Date;
}

export interface AuditEntryReader {
  listByCase(input: AuditEntryListInput): Promise<AuditEntryOutput[]>;
}

export interface AuditEntryWriter {
  record(input: AuditEntryWriteInput): Promise<void>;
}

export function createAuditEntryRepository(client: Client): AuditEntryReader {
  const db = drizzle(client);

  return {
    async listByCase({ tenantId, caseId }) {
      const rows = await db
        .select({
          id: auditEntryTable.id,
          caseId: auditEntryTable.caseId,
          actor: auditEntryTable.actor,
          action: auditEntryTable.action,
          outcome: auditEntryTable.outcome,
          occurredAt: auditEntryTable.occurredAt,
        })
        .from(auditEntryTable)
        .innerJoin(
          taxPlanCycleTable,
          eq(taxPlanCycleTable.id, auditEntryTable.caseId),
        )
        .where(
          and(
            eq(taxPlanCycleTable.tenantId, tenantId),
            eq(auditEntryTable.caseId, caseId),
          ),
        )
        .orderBy(asc(auditEntryTable.occurredAt));

      return rows.map((row) => serializeAuditEntryForOutput(row));
    },
  };
}

export function createAuditEntryWriter(client: Client): AuditEntryWriter {
  const db = drizzle(client);

  return {
    async record(input) {
      await db.insert(auditEntryTable).values({
        caseId: input.caseId,
        actor: input.actor,
        action: input.action,
        outcome: input.outcome,
        occurredAt: input.occurredAt,
      });
    },
  };
}
