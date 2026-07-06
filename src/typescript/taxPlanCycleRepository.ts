import type { Client } from "pg";

import { taxPlanCycleSchema, type TaxPlanCycle } from "./taxPlanCycle.js";

export interface TaxPlanCycleReadInput {
  tenantId: string;
  caseId: string;
}

export interface TaxPlanCycleReadHelper {
  findByCaseId(input: TaxPlanCycleReadInput): Promise<TaxPlanCycle | null>;
}

interface TaxPlanCycleRow {
  client_id: string;
  stage: TaxPlanCycle["stage"];
  owner: string;
  priority: TaxPlanCycle["priority"];
  due_date: string;
  on_hold: boolean;
  hold_reason: string | null;
}

function toTaxPlanCycle(row: TaxPlanCycleRow): TaxPlanCycle {
  // Temporary scaffold: the persisted cycle identifier is `client_id`, and we
  // mirror it into the API-facing `case_id` field until a dedicated case key
  // exists in storage.
  return taxPlanCycleSchema.parse({
    case_id: row.client_id,
    client_id: row.client_id,
    stage: row.stage,
    owner: row.owner,
    priority: row.priority,
    due_date: row.due_date,
    on_hold: row.on_hold,
    ...(row.hold_reason === null ? {} : { hold_reason: row.hold_reason }),
  });
}

export function createTaxPlanCycleReadHelper(
  client: Pick<Client, "query">,
): TaxPlanCycleReadHelper {
  return {
    async findByCaseId({ tenantId, caseId }) {
      const result = await client.query<TaxPlanCycleRow>(
        `
          SELECT
            client_id,
            stage,
            owner,
            priority,
            due_date::text AS due_date,
            on_hold,
            hold_reason
          FROM tax_plan_cycle
          WHERE tenant_id = $1
            AND client_id = $2
          LIMIT 1
        `,
        [tenantId, caseId],
      );
      const row = result.rows[0];

      if (!row) {
        return null;
      }

      return toTaxPlanCycle(row);
    },
  };
}
