import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import {
  incomeEvent as incomeEventTable,
  taxPlanCycle as taxPlanCycleTable,
} from "../../shared/database/schema.js";
import {
  incomeEventRowSchema,
  type IncomeEventRow,
  type IncomeEventType,
} from "./incomeEvents.js";

export interface IncomeEventListInput {
  tenantId: string;
  caseId: string;
}

export interface IncomeEventCreateInput extends IncomeEventListInput {
  date: string;
  source: string;
  type: IncomeEventType;
  amount: number;
  withholding: number;
}

export interface IncomeEventRepository {
  listByCase(input: IncomeEventListInput): Promise<IncomeEventRow[] | null>;
  create(input: IncomeEventCreateInput): Promise<IncomeEventRow | null>;
}

function normalizeDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
}

function toIncomeEventRow(row: {
  id: string;
  case_id: string;
  date: Date | string;
  source: string;
  type: string;
  amount: string | number;
  withholding: string | number;
}): IncomeEventRow {
  return incomeEventRowSchema.parse({
    ...row,
    date: normalizeDate(row.date),
    amount: String(row.amount),
    withholding: String(row.withholding),
  });
}

export function createIncomeEventRepository(
  client: Client,
): IncomeEventRepository {
  const db = drizzle(client);

  async function ownsCase(input: IncomeEventListInput): Promise<boolean> {
    const [cycle] = await db
      .select({ id: taxPlanCycleTable.id })
      .from(taxPlanCycleTable)
      .where(
        and(
          eq(taxPlanCycleTable.tenantId, input.tenantId),
          eq(taxPlanCycleTable.id, input.caseId),
        ),
      )
      .limit(1);

    return cycle !== undefined;
  }

  return {
    async listByCase(input) {
      if (!(await ownsCase(input))) {
        return null;
      }

      const rows = await db
        .select({
          id: incomeEventTable.id,
          case_id: incomeEventTable.caseId,
          date: incomeEventTable.date,
          source: incomeEventTable.source,
          type: incomeEventTable.type,
          amount: incomeEventTable.amount,
          withholding: incomeEventTable.withholding,
        })
        .from(incomeEventTable)
        .innerJoin(
          taxPlanCycleTable,
          eq(taxPlanCycleTable.id, incomeEventTable.caseId),
        )
        .where(
          and(
            eq(taxPlanCycleTable.tenantId, input.tenantId),
            eq(incomeEventTable.caseId, input.caseId),
          ),
        )
        .orderBy(asc(incomeEventTable.date), asc(incomeEventTable.id));

      return rows.map(toIncomeEventRow);
    },

    async create(input) {
      if (!(await ownsCase(input))) {
        return null;
      }

      const [created] = await db
        .insert(incomeEventTable)
        .values({
          caseId: input.caseId,
          date: input.date,
          source: input.source,
          type: input.type,
          amount: input.amount.toFixed(2),
          withholding: input.withholding.toFixed(2),
        })
        .returning({
          id: incomeEventTable.id,
          case_id: incomeEventTable.caseId,
          date: incomeEventTable.date,
          source: incomeEventTable.source,
          type: incomeEventTable.type,
          amount: incomeEventTable.amount,
          withholding: incomeEventTable.withholding,
        });

      if (!created) {
        throw new Error("Income event insert did not return a created row.");
      }

      return toIncomeEventRow(created);
    },
  };
}
