import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import {
  deduction as deductionTable,
  taxPlanCycle as taxPlanCycleTable,
} from "../../../shared/database/schema.js";
import {
  deductionTableRowSchema,
  type DeductionTableRow,
} from "./deduction.js";

export interface DeductionListInput {
  tenantId: string;
  caseId: string;
}

export interface DeductionCreateInput {
  tenantId: string;
  caseId: string;
  date: string;
  description: string;
  category: DeductionTableRow["category"];
  amount: number;
}

export interface DeductionRepository {
  listByCase(input: DeductionListInput): Promise<DeductionTableRow[]>;
  create(input: DeductionCreateInput): Promise<DeductionTableRow | null>;
}

function normalizeDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
}

function toDeductionTableRow(row: {
  id: string;
  case_id: string;
  date: Date | string;
  description: string;
  category: string;
  amount: string | number;
  tax_impact: string | number;
  deleted: boolean;
}): DeductionTableRow {
  return deductionTableRowSchema.parse({
    id: row.id,
    case_id: row.case_id,
    date: normalizeDate(row.date),
    description: row.description,
    category: row.category,
    amount: String(row.amount),
    tax_impact: String(row.tax_impact),
    deleted: row.deleted,
  });
}

export function createDeductionRepository(
  client: Client,
): DeductionRepository {
  const db = drizzle(client);

  return {
    async listByCase({ tenantId, caseId }) {
      const rows = await db
        .select({
          id: deductionTable.id,
          case_id: deductionTable.caseId,
          date: deductionTable.date,
          description: deductionTable.description,
          category: deductionTable.category,
          amount: deductionTable.amount,
          tax_impact: deductionTable.taxImpact,
          deleted: deductionTable.deleted,
        })
        .from(deductionTable)
        .innerJoin(
          taxPlanCycleTable,
          eq(taxPlanCycleTable.id, deductionTable.caseId),
        )
        .where(
          and(
            eq(taxPlanCycleTable.tenantId, tenantId),
            eq(deductionTable.caseId, caseId),
          ),
        )
        .orderBy(asc(deductionTable.date), asc(deductionTable.id));

      return rows.map((row) => toDeductionTableRow(row));
    },
    async create({ tenantId, caseId, date, description, category, amount }) {
      const [cycle] = await db
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

      const roundedAmount = amount.toFixed(2);
      const taxImpact = (amount * 0.25).toFixed(2);
      const [created] = await db
        .insert(deductionTable)
        .values({
          caseId,
          date,
          description,
          category,
          amount: roundedAmount,
          taxImpact,
        })
        .returning({
          id: deductionTable.id,
          case_id: deductionTable.caseId,
          date: deductionTable.date,
          description: deductionTable.description,
          category: deductionTable.category,
          amount: deductionTable.amount,
          tax_impact: deductionTable.taxImpact,
          deleted: deductionTable.deleted,
        });

      if (!created) {
        throw new Error("Deduction insert did not return a created row.");
      }

      return toDeductionTableRow(created);
    },
  };
}
