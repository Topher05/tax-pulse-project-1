import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, test } from "vitest";

import { auditEntry } from "../../../../../src/typescript/shared/database/schema.js";
import {
  taxPlanCycleRows,
  tenantRows,
  userRows,
} from "../../../../../src/typescript/shared/database/seed.model.js";
import { createTaxPlanCycleCommentRepository } from "../../../../../src/typescript/features/taxPlanCycle/index.js";
import { withDockerDrizzleSeededDatabase } from "../../../bootstrap/migrationTestUtils.js";

describe("tax plan cycle comment repository", () => {
  test("creates and reads persisted comments with tenant isolation and audit creation", { timeout: 120000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const db = drizzle(client);
      const repository = createTaxPlanCycleCommentRepository(client);
      const caseId = taxPlanCycleRows[5].id;
      const tenantId = tenantRows[2].id;
      const actor = userRows[12];

      const before = await repository.listByCase({ tenantId, caseId });
      const created = await repository.create({
        tenantId,
        caseId,
        actorId: actor.id,
        actorRole: "Advisor",
        body: "  Confirm the Roth conversion scenario before client approval.  ",
      });
      const after = await repository.listByCase({ tenantId, caseId });
      const crossTenant = await repository.listByCase({
        tenantId: tenantRows[0].id,
        caseId,
      });
      const latestAuditRows = await db
        .select({
          caseId: auditEntry.caseId,
          actor: auditEntry.actor,
          action: auditEntry.action,
          outcome: auditEntry.outcome,
          occurredAt: auditEntry.occurredAt,
        })
        .from(auditEntry)
        .where(eq(auditEntry.caseId, caseId))
        .orderBy(desc(auditEntry.occurredAt))
        .limit(1);

      expect(before.map((comment) => comment.author_display_name)).toEqual([
        "Riley Park",
        "Dana Cohen, CPA",
      ]);
      expect(created).toMatchObject({
        case_id: caseId,
        actor_id: actor.id,
        actor_role: "Advisor",
        author_display_name: actor.displayName,
        body: "Confirm the Roth conversion scenario before client approval.",
      });
      expect(after.map((comment) => comment.id)).toContain(created?.id);
      expect(after.map((comment) => comment.created_at)).toEqual(
        [...after.map((comment) => comment.created_at)].sort(),
      );
      expect(crossTenant).toEqual([]);
      expect(latestAuditRows[0]).toMatchObject({
        caseId,
        actor: actor.id,
        action: "comment_created",
        outcome: "succeeded",
      });
      expect(latestAuditRows[0]?.occurredAt).toBeInstanceOf(Date);
    });
  });

  test("returns null for missing or cross-tenant cases before inserting", { timeout: 120000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const repository = createTaxPlanCycleCommentRepository(client);

      await expect(
        repository.create({
          tenantId: tenantRows[0].id,
          caseId: taxPlanCycleRows[5].id,
          actorId: userRows[0].id,
          actorRole: "Firm Admin",
          body: "Cross tenant should not insert.",
        }),
      ).resolves.toBeNull();
    });
  });
});
