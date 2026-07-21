import { and, asc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import {
  auditEntry as auditEntryTable,
  stageTransition as stageTransitionTable,
  taxPlanCycle as taxPlanCycleTable,
  taxPlanCycleIdempotencyKey as taxPlanCycleIdempotencyKeyTable,
} from "./db/schema.js";
import { taxPlanCycleSchema, type TaxPlanCycle } from "./taxPlanCycle.js";

export interface TaxPlanCycleReadInput {
  tenantId: string;
  caseId: string;
}

export interface TaxPlanCycleQueueInput {
  tenantId: string;
  asOfDate?: string;
}

export interface TaxPlanCycleRepositoryCreateInput {
  tenantId: string;
  planningPeriod: string;
  clientId: TaxPlanCycle["client_id"];
  owner: TaxPlanCycle["owner"];
  priority: TaxPlanCycle["priority"];
  dueDate: TaxPlanCycle["due_date"];
  actor: string;
  idempotencyKey: string;
}

export interface TaxPlanCycleInsertInput {
  tenantId: string;
  planningPeriod: string;
  cycle: Omit<TaxPlanCycle, "id">;
}

export type TaxPlanCycleQueueItem = TaxPlanCycle & {
  is_overdue: boolean;
};

export interface TaxPlanCycleRepository {
  create(input: TaxPlanCycleRepositoryCreateInput): Promise<string>;
  insert(input: TaxPlanCycleInsertInput): Promise<string>;
  findByCaseId(input: TaxPlanCycleReadInput): Promise<TaxPlanCycle | null>;
  listQueue(input: TaxPlanCycleQueueInput): Promise<TaxPlanCycleQueueItem[]>;
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

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toTaxPlanCycleQueueItem(
  row: Parameters<typeof toTaxPlanCycle>[0],
  asOfDate: string,
): TaxPlanCycleQueueItem {
  const cycle = toTaxPlanCycle(row);

  return {
    ...cycle,
    is_overdue: cycle.due_date < asOfDate,
  };
}

export function createTaxPlanCycleRepository(
  client: Client,
): TaxPlanCycleRepository {
  const db = drizzle(client);

  async function persistCycle(input: {
    tenantId: string;
    planningPeriod: string;
    clientId: string;
    owner: string;
    priority: string;
    dueDate: string;
    onHold: boolean;
    holdReason: string | null;
    actor: string;
    idempotencyKey?: string;
  }): Promise<string> {
    return await db.transaction(async (tx) => {
      if (input.idempotencyKey) {
        await tx.execute(sql`
          SELECT pg_advisory_xact_lock(
            hashtext(${input.tenantId}),
            hashtext(${input.idempotencyKey})
          )
        `);

        const existingRows = await tx
          .select({ caseId: taxPlanCycleIdempotencyKeyTable.caseId })
          .from(taxPlanCycleIdempotencyKeyTable)
          .where(
            and(
              eq(taxPlanCycleIdempotencyKeyTable.tenantId, input.tenantId),
              eq(
                taxPlanCycleIdempotencyKeyTable.idempotencyKey,
                input.idempotencyKey,
              ),
            ),
          )
          .limit(1);
        const existingCaseId = existingRows[0]?.caseId;

        if (existingCaseId) {
          return existingCaseId;
        }
      }

      const rows = await tx
        .insert(taxPlanCycleTable)
        .values({
          clientId: input.clientId,
          tenantId: input.tenantId,
          planningPeriod: input.planningPeriod,
          stage: "Intake",
          owner: input.owner,
          priority: input.priority,
          dueDate: input.dueDate,
          onHold: input.onHold,
          holdReason: input.holdReason,
        })
        .returning({ caseId: taxPlanCycleTable.id });

      const caseId = rows[0]?.caseId;

      if (!caseId) {
        throw new Error("Tax Plan Cycle insert did not return a generated case ID.");
      }

      const occurredAt = new Date();
      const fromStage = "Intake";
      const toStage = "Intake";

      await tx.insert(stageTransitionTable).values({
        caseId,
        fromStage,
        toStage,
        actor: input.actor,
        occurredAt,
      });

      await tx.insert(auditEntryTable).values({
        caseId,
        actor: input.actor,
        action: `stage_transition:${fromStage}->${toStage}`,
        outcome: "succeeded",
        occurredAt,
      });

      if (input.idempotencyKey) {
        await tx.insert(taxPlanCycleIdempotencyKeyTable).values({
          tenantId: input.tenantId,
          idempotencyKey: input.idempotencyKey,
          caseId,
        });
      }

      return caseId;
    });
  }

  return {
    async create(input) {
      return await persistCycle({
        tenantId: input.tenantId,
        planningPeriod: input.planningPeriod,
        clientId: input.clientId,
        owner: input.owner,
        priority: input.priority,
        dueDate: input.dueDate,
        onHold: false,
        holdReason: null,
        actor: input.actor,
        idempotencyKey: input.idempotencyKey,
      });
    },

    async insert({ tenantId, planningPeriod, cycle }) {
      return await persistCycle({
        tenantId,
        planningPeriod,
        clientId: cycle.client_id,
        owner: cycle.owner,
        priority: cycle.priority,
        dueDate: cycle.due_date,
        onHold: cycle.on_hold,
        holdReason: cycle.hold_reason ?? null,
        actor: cycle.owner,
      });
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

    async listQueue({ tenantId, asOfDate = todayIsoDate() }) {
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
        .where(eq(taxPlanCycleTable.tenantId, tenantId))
        .orderBy(asc(taxPlanCycleTable.dueDate));

      return rows.map((row) => toTaxPlanCycleQueueItem(row, asOfDate));
    },
  };
}

export function createTaxPlanCycleReadHelper(
  client: Client,
): TaxPlanCycleReadHelper {
  return createTaxPlanCycleRepository(client);
}
