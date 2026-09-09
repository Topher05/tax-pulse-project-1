import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import {
  auditEntry as auditEntryTable,
  roles as rolesTable,
  taxPlanCycle as taxPlanCycleTable,
  taxPlanCycleComment as commentTable,
  users as usersTable,
} from "../../../shared/database/schema.js";
import {
  taxPlanCycleCommentSchema,
  type TaxPlanCycleComment,
} from "../comments.js";

export interface TaxPlanCycleCommentListInput {
  tenantId: string;
  caseId: string;
}

export interface TaxPlanCycleCommentCreateInput extends TaxPlanCycleCommentListInput {
  actorId: string;
  actorRole: TaxPlanCycleComment["actor_role"];
  body: string;
}

export interface TaxPlanCycleCommentRepository {
  listByCase(input: TaxPlanCycleCommentListInput): Promise<TaxPlanCycleComment[]>;
  create(input: TaxPlanCycleCommentCreateInput): Promise<TaxPlanCycleComment | null>;
}

function toComment(row: {
  id: string;
  caseId: string;
  actorId: string;
  actorRole: string;
  authorDisplayName: string;
  body: string;
  createdAt: Date;
}): TaxPlanCycleComment {
  return taxPlanCycleCommentSchema.parse({
    id: row.id,
    case_id: row.caseId,
    actor_id: row.actorId,
    actor_role: row.actorRole,
    author_display_name: row.authorDisplayName,
    body: row.body,
    created_at: row.createdAt.toISOString(),
  });
}

export function createTaxPlanCycleCommentRepository(
  client: Client,
): TaxPlanCycleCommentRepository {
  const db = drizzle(client);

  return {
    async listByCase({ tenantId, caseId }) {
      const rows = await db
        .select({
          id: commentTable.id,
          caseId: commentTable.caseId,
          actorId: commentTable.actorId,
          actorRole: commentTable.actorRole,
          authorDisplayName: commentTable.authorDisplayName,
          body: commentTable.body,
          createdAt: commentTable.createdAt,
        })
        .from(commentTable)
        .innerJoin(
          taxPlanCycleTable,
          eq(taxPlanCycleTable.id, commentTable.caseId),
        )
        .where(
          and(
            eq(taxPlanCycleTable.tenantId, tenantId),
            eq(commentTable.tenantId, tenantId),
            eq(commentTable.caseId, caseId),
          ),
        )
        .orderBy(asc(commentTable.createdAt), asc(commentTable.id));

      return rows.map(toComment);
    },

    async create({ tenantId, caseId, actorId, actorRole, body }) {
      const trimmedBody = body.trim();

      if (trimmedBody.length === 0) {
        throw new Error("Tax plan cycle comments require a non-empty body.");
      }

      return await db.transaction(async (tx) => {
        const [cycle] = await tx
          .select({ id: taxPlanCycleTable.id })
          .from(taxPlanCycleTable)
          .where(
            and(
              eq(taxPlanCycleTable.tenantId, tenantId),
              eq(taxPlanCycleTable.id, caseId),
            ),
          )
          .limit(1);

        if (!cycle) {
          return null;
        }

        const [actor] = await tx
          .select({
            displayName: usersTable.displayName,
            role: rolesTable.role,
          })
          .from(usersTable)
          .innerJoin(rolesTable, eq(rolesTable.id, usersTable.roleId))
          .where(
            and(
              eq(usersTable.tenantId, tenantId),
              eq(usersTable.id, actorId),
              eq(rolesTable.role, actorRole),
            ),
          )
          .limit(1);

        if (!actor) {
          throw new TaxPlanCycleCommentActorUnavailableError();
        }

        const occurredAt = new Date();
        const [row] = await tx
          .insert(commentTable)
          .values({
            caseId,
            tenantId,
            actorId,
            actorRole: actor.role,
            authorDisplayName: actor.displayName,
            body: trimmedBody,
            createdAt: occurredAt,
          })
          .returning({
            id: commentTable.id,
            caseId: commentTable.caseId,
            actorId: commentTable.actorId,
            actorRole: commentTable.actorRole,
            authorDisplayName: commentTable.authorDisplayName,
            body: commentTable.body,
            createdAt: commentTable.createdAt,
          });

        if (!row) {
          throw new Error("Tax plan cycle comment insert did not return a row.");
        }

        await tx.insert(auditEntryTable).values({
          caseId,
          actor: actorId,
          action: "comment_created",
          outcome: "succeeded",
          occurredAt,
        });

        return toComment(row);
      });
    },
  };
}

export class TaxPlanCycleCommentActorUnavailableError extends Error {
  constructor() {
    super("The authenticated actor is unavailable in the requested tenant.");
    this.name = "TaxPlanCycleCommentActorUnavailableError";
  }
}
