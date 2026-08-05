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

export interface DeductionRepository {
  listByCase(input: DeductionListInput): Promise<DeductionTableRow[]>;
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
  };
}
