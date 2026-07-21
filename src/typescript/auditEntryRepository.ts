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

export interface AuditEntryReader {
  listByCase(input: AuditEntryListInput): Promise<AuditEntryOutput[]>;
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
