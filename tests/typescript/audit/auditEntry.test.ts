import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, test } from "vitest";

import { auditEntry } from "../../../src/typescript/shared/database/schema.js";
import { taxPlanCycleRows } from "../../../src/typescript/shared/database/seed.model.js";
import { withDockerDrizzleSeededDatabase } from "../bootstrap/migrationTestUtils.js";
import { expectPgError, getTableStructure } from "../bootstrap/tableTestUtils.js";

const expectedAuditEntryColumns = [
  "id",
  "case_id",
  "actor",
  "action",
  "outcome",
  "occurred_at",
] as const;

const expectedAuditEntryColumnTypes = {
  id: "uuid",
  case_id: "uuid",
  actor: "text",
  action: "text",
  outcome: "text",
  occurred_at: "timestamp with time zone",
} as const;

const sampleAuditEntryId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71";
const missingCaseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d99";
const appendOnlyMessage =
  "audit_entry is append-only and cannot be updated or deleted";

describe("audit_entry migration", () => {
  test("tracks the audit_entry table contract", { timeout: 30000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const structure = await getTableStructure(client, "audit_entry");

      expect(structure.columns).toEqual(expectedAuditEntryColumns);
      expect(structure.columnTypes).toEqual(expectedAuditEntryColumnTypes);
      expect(structure.constraints.audit_entry_id_pk?.type).toBe("p");
      expect(structure.constraints.audit_entry_case_id_fk?.type).toBe("f");
      expect(structure.indexes).toContain(
        "audit_entry_case_id_occurred_at_idx",
      );
      expect(structure.rowCount).toBe(0);
    });
  });

  test("stores audit rows by case and rejects missing case references", { timeout: 30000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const db = drizzle(client);

      const [storedAuditEntry] = await db
        .insert(auditEntry)
        .values({
          id: sampleAuditEntryId,
          caseId: taxPlanCycleRows[0].id,
          actor: "advisor-001",
          action: "created audit table contract row",
          outcome: "succeeded",
        })
        .returning({
          id: auditEntry.id,
          caseId: auditEntry.caseId,
          actor: auditEntry.actor,
          action: auditEntry.action,
          outcome: auditEntry.outcome,
          occurredAt: auditEntry.occurredAt,
        });

      expect(storedAuditEntry).toMatchObject({
        id: sampleAuditEntryId,
        caseId: taxPlanCycleRows[0].id,
        actor: "advisor-001",
        action: "created audit table contract row",
        outcome: "succeeded",
      });
      expect(storedAuditEntry?.occurredAt).toBeInstanceOf(Date);

      await expectPgError(
        db.insert(auditEntry).values({
          caseId: missingCaseId,
          actor: "advisor-001",
          action: "referenced missing case",
          outcome: "failed",
        }),
        { code: "23503", constraint: "audit_entry_case_id_fk" },
      );
    });
  });

  test("blocks updates and deletes with the append-only trigger", { timeout: 30000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const db = drizzle(client);

      await db.insert(auditEntry).values({
        id: sampleAuditEntryId,
        caseId: taxPlanCycleRows[0].id,
        actor: "advisor-001",
        action: "attempted transition",
        outcome: "succeeded",
      });

      await expectPgError(
        db
          .update(auditEntry)
          .set({ outcome: "mutated" })
          .where(eq(auditEntry.id, sampleAuditEntryId)),
        { code: "P0001", messageIncludes: appendOnlyMessage },
      );

      await expectPgError(
        db.delete(auditEntry).where(eq(auditEntry.id, sampleAuditEntryId)),
        { code: "P0001", messageIncludes: appendOnlyMessage },
      );
    });
  });
});
