import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import { taxPlanCycle as taxPlanCycleTable } from "./db/schema.js";
import { taxPlanCycleSchema, type TaxPlanCycle } from "./taxPlanCycle.js";

export interface TaxPlanCycleReadInput {
  tenantId: string;
  caseId: string;
}

export interface TaxPlanCycleInsertInput {
  tenantId: string;
  planningPeriod: string;
  cycle: Omit<TaxPlanCycle, "id">;
}

export interface TaxPlanCycleRepository {
  insert(input: TaxPlanCycleInsertInput): Promise<string>;
  findByCaseId(input: TaxPlanCycleReadInput): Promise<TaxPlanCycle | null>;
}

export type TaxPlanCycleReadHelper = Pick<TaxPlanCycleRepository, "findByCaseId">;

function toTaxPlanCycle(row: {
  id: string;
  clientId: string;
  stage: string;
  owner: string;
  priority: string;
  dueDate: string;
  onHold: boolean;
  holdReason: string | null;
}): TaxPlanCycle {
  return taxPlanCycleSchema.parse({
    id: row.id,
    client_id: row.clientId,
    stage: row.stage,
    owner: row.owner,
    priority: row.priority,
    due_date: row.dueDate,
    on_hold: row.onHold,
    ...(row.holdReason === null ? {} : { hold_reason: row.holdReason }),
  });
}

export function createTaxPlanCycleRepository(
  client: Client,
): TaxPlanCycleRepository {
  const db = drizzle(client);

  return {
    async insert({ tenantId, planningPeriod, cycle }) {
      const rows = await db
        .insert(taxPlanCycleTable)
        .values({
          clientId: cycle.client_id,
          tenantId,
          planningPeriod,
          stage: cycle.stage,
          owner: cycle.owner,
          priority: cycle.priority,
          dueDate: cycle.due_date,
          onHold: cycle.on_hold,
          holdReason: cycle.hold_reason ?? null,
        })
        .returning({ caseId: taxPlanCycleTable.id });

      const caseId = rows[0]?.caseId;

      if (!caseId) {
        throw new Error("Tax Plan Cycle insert did not return a generated case ID.");
      }

      return caseId;
    },

    async findByCaseId({ tenantId, caseId }) {
      const rows = await db
        .select({
          id: taxPlanCycleTable.id,
          clientId: taxPlanCycleTable.clientId,
          stage: taxPlanCycleTable.stage,
          owner: taxPlanCycleTable.owner,
          priority: taxPlanCycleTable.priority,
          dueDate: taxPlanCycleTable.dueDate,
          onHold: taxPlanCycleTable.onHold,
          holdReason: taxPlanCycleTable.holdReason,
        })
        .from(taxPlanCycleTable)
        .where(
          and(
            eq(taxPlanCycleTable.tenantId, tenantId),
            eq(taxPlanCycleTable.id, caseId),
          ),
        )
        .limit(1);

      const row = rows[0];

      return row ? toTaxPlanCycle(row) : null;
    },
  };
}

export function createTaxPlanCycleReadHelper(
  client: Client,
): TaxPlanCycleReadHelper {
  return createTaxPlanCycleRepository(client);
}
