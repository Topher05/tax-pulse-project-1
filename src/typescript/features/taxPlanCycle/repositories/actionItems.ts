import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import { actionItem as actionItemTable } from "../../../shared/database/schema.js";
import { actionItemSchema, type ActionItem } from "../actionItem.js";

export interface ActionItemCreateInput {
  caseId: string;
  description: string;
  deadline: string;
  completed: boolean;
}

export interface ActionItemRepository {
  insert(input: ActionItemCreateInput): Promise<ActionItem>;
  listByCaseId(caseId: string): Promise<readonly ActionItem[]>;
  complete(input: { caseId: string; actionItemId: number }): Promise<ActionItem | null>;
}

function toActionItem(row: {
  id: number;
  caseId: string;
  description: string;
  deadline: string | Date;
  completed: boolean;
}): ActionItem {
  return actionItemSchema.parse({
    id: row.id,
    case_id: row.caseId,
    description: row.description,
    deadline:
      row.deadline instanceof Date
        ? row.deadline.toISOString().slice(0, 10)
        : row.deadline,
    completed: row.completed,
  });
}

export function createActionItemRepository(client: Client): ActionItemRepository {
  const db = drizzle(client);

  return {
    async insert(input) {
      const rows = await db
        .insert(actionItemTable)
        .values({
          caseId: input.caseId,
          description: input.description,
          deadline: input.deadline,
          completed: input.completed,
        })
        .returning({
          id: actionItemTable.id,
          caseId: actionItemTable.caseId,
          description: actionItemTable.description,
          deadline: actionItemTable.deadline,
          completed: actionItemTable.completed,
        });

      const row = rows[0];

      if (!row) {
        throw new Error("Action item insert did not return a stored action item.");
      }

      return toActionItem(row);
    },
    async listByCaseId(caseId) {
      const rows = await db
        .select({
          id: actionItemTable.id,
          caseId: actionItemTable.caseId,
          description: actionItemTable.description,
          deadline: actionItemTable.deadline,
          completed: actionItemTable.completed,
        })
        .from(actionItemTable)
        .where(eq(actionItemTable.caseId, caseId))
        .orderBy(asc(actionItemTable.deadline), asc(actionItemTable.id));

      return rows.map(toActionItem);
    },
    async complete(input) {
      const rows = await db
        .update(actionItemTable)
        .set({ completed: true })
        .where(
          and(
            eq(actionItemTable.id, input.actionItemId),
            eq(actionItemTable.caseId, input.caseId),
            eq(actionItemTable.completed, false),
          ),
        )
        .returning({
          id: actionItemTable.id,
          caseId: actionItemTable.caseId,
          description: actionItemTable.description,
          deadline: actionItemTable.deadline,
          completed: actionItemTable.completed,
        });

      const row = rows[0];
      return row ? toActionItem(row) : null;
    },
  };
}
