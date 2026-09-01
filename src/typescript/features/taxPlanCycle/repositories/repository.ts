import { and, asc, desc, eq, max, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import {
  auditEntry as auditEntryTable,
  clientRoster as clientRosterTable,
  outboxEvent as outboxEventTable,
  stageTransition as stageTransitionTable,
  taxPlanCycle as taxPlanCycleTable,
  taxpayerIdentifierValidation as taxpayerIdentifierValidationTable,
} from "../../../shared/database/schema.js";
import { createStageChangedCloudEventV1 } from "../stageChangedEvent.js";
import { taxPlanCycleSchema, type TaxPlanCycle } from "../taxPlanCycle.js";
import type {
  TaxpayerIdentifierType,
  TaxpayerIdentifierValidationResult,
} from "../taxpayerIdentifierValidation.js";

export interface TaxPlanCycleReadInput {
  tenantId: string;
  caseId: string;
}

export interface TaxPlanCycleQueueInput {
  tenantId: string;
  asOfDate?: string;
}

export interface TaxPlanCycleClientReadInput {
  tenantId: string;
  clientId: string;
}

export interface TaxPlanCycleRepositoryCreateInput {
  tenantId: string;
  planningPeriod: string;
  clientId: TaxPlanCycle["client_id"];
  owner: TaxPlanCycle["owner"];
  priority: TaxPlanCycle["priority"];
  dueDate: TaxPlanCycle["due_date"];
  actor: string;
  taxpayerIdentifierValidation?: {
    tinType: TaxpayerIdentifierType;
    validationResult: TaxpayerIdentifierValidationResult;
    verifiedName?: string;
    provider: "tivs";
    validatedAt?: Date;
  };
}

export interface TaxPlanCycleInsertInput {
  tenantId: string;
  planningPeriod: string;
  cycle: Omit<TaxPlanCycle, "id">;
}

export interface TaxPlanCycleTransitionInput {
  tenantId: string;
  caseId: string;
  toStage: TaxPlanCycle["stage"];
  actor: string;
}

export type TaxPlanCycleQueueItem = TaxPlanCycle & {
  client_name: string;
  is_overdue: boolean;
  updated_at: string;
};

export interface TaxPlanCycleRepository {
  create(input: TaxPlanCycleRepositoryCreateInput): Promise<string>;
  insert(input: TaxPlanCycleInsertInput): Promise<string>;
  findByCaseId(input: TaxPlanCycleReadInput): Promise<TaxPlanCycle | null>;
  findCurrentByClientId(input: TaxPlanCycleClientReadInput): Promise<TaxPlanCycle | null>;
  transition(
    input: TaxPlanCycleTransitionInput,
  ): Promise<TaxPlanCycle | null>;
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
  row: Parameters<typeof toTaxPlanCycle>[0] & { clientName: string },
  asOfDate: string,
  updatedAt: Date | null,
): TaxPlanCycleQueueItem {
  const cycle = toTaxPlanCycle(row);
  const queueUpdatedAt = updatedAt ?? new Date(`${cycle.due_date}T00:00:00.000Z`);

  return {
    ...cycle,
    client_name: row.clientName,
    is_overdue: cycle.due_date < asOfDate,
    updated_at: queueUpdatedAt.toISOString(),
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
    taxpayerIdentifierValidation?: TaxPlanCycleRepositoryCreateInput["taxpayerIdentifierValidation"];
  }): Promise<string> {
    return await db.transaction(async (tx) => {
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

      if (input.taxpayerIdentifierValidation) {
        await tx.insert(taxpayerIdentifierValidationTable).values({
          tenantId: input.tenantId,
          caseId,
          tinType: input.taxpayerIdentifierValidation.tinType,
          validationResult: input.taxpayerIdentifierValidation.validationResult,
          verifiedName: input.taxpayerIdentifierValidation.verifiedName ?? null,
          provider: input.taxpayerIdentifierValidation.provider,
          validatedAt: input.taxpayerIdentifierValidation.validatedAt ?? occurredAt,
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
        taxpayerIdentifierValidation: input.taxpayerIdentifierValidation,
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

    async findCurrentByClientId({ tenantId, clientId }) {
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
            eq(taxPlanCycleTable.clientId, clientId),
            ne(taxPlanCycleTable.stage, "Archived"),
          ),
        )
        .orderBy(desc(taxPlanCycleTable.dueDate))
        .limit(1);

      const row = rows[0];

      return row ? toTaxPlanCycle(row) : null;
    },

    async transition({ tenantId, caseId, toStage, actor }) {
      return await db.transaction(async (tx) => {
        const rows = await tx
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

        const currentRow = rows[0];

        if (!currentRow) {
          return null;
        }

        const currentCycle = toTaxPlanCycle(currentRow);
        const occurredAt = new Date();
        const stageChangedEvent = createStageChangedCloudEventV1(
          {
            tenantId,
            caseId,
            fromStage: currentCycle.stage,
            toStage,
            actor,
          },
          { now: () => occurredAt },
        );

        await tx
          .update(taxPlanCycleTable)
          .set({
            stage: toStage,
          })
          .where(
            and(
              eq(taxPlanCycleTable.tenantId, tenantId),
              eq(taxPlanCycleTable.id, caseId),
            ),
          );

        await tx.insert(stageTransitionTable).values({
          caseId,
          fromStage: currentCycle.stage,
          toStage,
          actor,
          occurredAt,
        });

        await tx.insert(outboxEventTable).values({
          payload: JSON.stringify(stageChangedEvent),
          createdAt: occurredAt,
        });

        return taxPlanCycleSchema.parse({
          ...currentCycle,
          stage: toStage,
        });
      });
    },

    async listQueue({ tenantId, asOfDate = todayIsoDate() }) {
      const [rows, latestTransitions] = await Promise.all([
        db
          .select({
            id: taxPlanCycleTable.id,
            clientId: taxPlanCycleTable.clientId,
            clientName: clientRosterTable.clientName,
            stage: taxPlanCycleTable.stage,
            owner: taxPlanCycleTable.owner,
            priority: taxPlanCycleTable.priority,
            dueDate: taxPlanCycleTable.dueDate,
            onHold: taxPlanCycleTable.onHold,
            holdReason: taxPlanCycleTable.holdReason,
          })
          .from(taxPlanCycleTable)
          .innerJoin(
            clientRosterTable,
            and(
              eq(clientRosterTable.id, taxPlanCycleTable.clientId),
              eq(clientRosterTable.tenantId, taxPlanCycleTable.tenantId),
            ),
          )
          .where(eq(taxPlanCycleTable.tenantId, tenantId))
          .orderBy(asc(taxPlanCycleTable.dueDate)),
        db
          .select({
            caseId: stageTransitionTable.caseId,
            updatedAt: max(stageTransitionTable.occurredAt),
          })
          .from(stageTransitionTable)
          .innerJoin(
            taxPlanCycleTable,
            eq(taxPlanCycleTable.id, stageTransitionTable.caseId),
          )
          .where(eq(taxPlanCycleTable.tenantId, tenantId))
          .groupBy(stageTransitionTable.caseId),
      ]);
      const latestTransitionByCaseId = new Map(
        latestTransitions.map((row) => [row.caseId, row.updatedAt ?? null]),
      );

      return rows.map((row) =>
        toTaxPlanCycleQueueItem(
          row,
          asOfDate,
          latestTransitionByCaseId.get(row.id) ?? null,
        ),
      );
    },
  };
}

export function createTaxPlanCycleReadHelper(
  client: Client,
): TaxPlanCycleReadHelper {
  return createTaxPlanCycleRepository(client);
}
