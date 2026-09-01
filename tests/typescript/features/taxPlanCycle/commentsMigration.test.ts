import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, test } from "vitest";

import { taxPlanCycleComment } from "../../../../src/typescript/shared/database/schema.js";
import {
  taxPlanCycleCommentRows,
  taxPlanCycleRows,
  tenantRows,
  userRows,
} from "../../../../src/typescript/shared/database/seed.model.js";
import { withDockerDrizzleSeededDatabase } from "../../bootstrap/migrationTestUtils.js";
import { expectPgError, getTableStructure } from "../../bootstrap/tableTestUtils.js";

const expectedCommentColumns = [
  "id",
  "case_id",
  "tenant_id",
  "actor_id",
  "actor_role",
  "author_display_name",
  "body",
  "created_at",
] as const;

const expectedCommentColumnTypes = {
  id: "uuid",
  case_id: "uuid",
  tenant_id: "uuid",
  actor_id: "uuid",
  actor_role: "USER-DEFINED",
  author_display_name: "text",
  body: "text",
  created_at: "timestamp with time zone",
} as const;

describe("tax_plan_cycle_comment migration", () => {
  test("tracks the comment table contract and seeded mock replacement rows", { timeout: 120000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const structure = await getTableStructure(client, "tax_plan_cycle_comment");
      const db = drizzle(client);
      const seededRows = await db
        .select({
          id: taxPlanCycleComment.id,
          authorDisplayName: taxPlanCycleComment.authorDisplayName,
          body: taxPlanCycleComment.body,
        })
        .from(taxPlanCycleComment);

      expect(structure.columns).toEqual(expectedCommentColumns);
      expect(structure.columnTypes).toEqual(expectedCommentColumnTypes);
      expect(structure.constraints.tax_plan_cycle_comment_id_pk?.type).toBe("p");
      expect(structure.constraints.tax_plan_cycle_comment_case_id_fk?.type).toBe("f");
      expect(structure.constraints.tax_plan_cycle_comment_tenant_id_fk?.type).toBe("f");
      expect(structure.constraints.tax_plan_cycle_comment_actor_id_fk?.type).toBe("f");
      expect(structure.constraints.tax_plan_cycle_comment_body_nonblank_check?.type).toBe("c");
      expect(structure.indexes).toContain("tax_plan_cycle_comment_tenant_case_created_idx");
      expect(structure.rowCount).toBe(taxPlanCycleCommentRows.length);
      expect(seededRows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: taxPlanCycleCommentRows[0].id,
            authorDisplayName: "Riley Park",
            body: taxPlanCycleCommentRows[0].body,
          }),
          expect.objectContaining({
            id: taxPlanCycleCommentRows[1].id,
            authorDisplayName: "Dana Cohen, CPA",
            body: taxPlanCycleCommentRows[1].body,
          }),
        ]),
      );
    });
  });

  test("enforces case, tenant, actor, and nonblank body constraints", { timeout: 120000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const db = drizzle(client);

      await expectPgError(
        db.insert(taxPlanCycleComment).values({
          caseId: taxPlanCycleRows[5].id,
          tenantId: tenantRows[2].id,
          actorId: userRows[12].id,
          actorRole: "Advisor",
          authorDisplayName: "Daniel Kim",
          body: "   ",
        }),
        { code: "23514", constraint: "tax_plan_cycle_comment_body_nonblank_check" },
      );

      await expectPgError(
        db.insert(taxPlanCycleComment).values({
          caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9fff",
          tenantId: tenantRows[2].id,
          actorId: userRows[12].id,
          actorRole: "Advisor",
          authorDisplayName: "Daniel Kim",
          body: "Missing case.",
        }),
        { code: "23503", constraint: "tax_plan_cycle_comment_case_id_fk" },
      );
    });
  });
});
