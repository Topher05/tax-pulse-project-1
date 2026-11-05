import { and, asc, desc, eq, max, min, ne, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";
import { buildTaxPlanCycleLabels, displayPersonName } from "../../../shared/displayLabels.js";

import {
  auditEntry as auditEntryTable,
  clientRoster as clientRosterTable,
  outboxEvent as outboxEventTable,
  stageTransition as stageTransitionTable,
  taxPlanCycle as taxPlanCycleTable,
  taxpayerIdentifierValidation as taxpayerIdentifierValidationTable,
  users as usersTable,
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

export interface TaxPlanCycleRouteKeyReadInput {
  tenantId: string;
  routeKey: string;
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

export interface TaxPlanCycleHoldInput {
  tenantId: string;
  caseId: string;
  onHold: boolean;
  holdReason?: string;
}

export class TaxPlanCycleOnHoldError extends Error {
  constructor() {
    super("A Tax Plan Cycle on hold cannot advance stages.");
    this.name = "TaxPlanCycleOnHoldError";
  }
}

export type TaxPlanCycleQueueItem = TaxPlanCycle & {
  route_key: string;
  client_name: string;
  planning_period?: string;
  owner_display_name?: string;
  cycle_label?: string;
  is_overdue: boolean;
  updated_at: string;
};

export interface TaxPlanCycleRepository {
  create(input: TaxPlanCycleRepositoryCreateInput): Promise<string>;
  insert(input: TaxPlanCycleInsertInput): Promise<string>;
  findByCaseId(input: TaxPlanCycleReadInput): Promise<TaxPlanCycle | null>;
  findByRouteKey?(input: TaxPlanCycleRouteKeyReadInput): Promise<TaxPlanCycle | null>;
  findCurrentByClientId(input: TaxPlanCycleClientReadInput): Promise<TaxPlanCycle | null>;
  transition(
    input: TaxPlanCycleTransitionInput,
  ): Promise<TaxPlanCycle | null>;
  setHoldStatus(input: TaxPlanCycleHoldInput): Promise<TaxPlanCycle | null>;
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
  row: Parameters<typeof toTaxPlanCycle>[0] & {
    routeKey: string;
    clientName: string;
    planningPeriod: string;
    ownerDisplayName: string;
  },
  asOfDate: string,
  updatedAt: Date | null,
  cycleLabel: string,
): TaxPlanCycleQueueItem {
  const cycle = toTaxPlanCycle(row);
  const queueUpdatedAt = updatedAt ?? new Date(`${cycle.due_date}T00:00:00.000Z`);

  return {
    ...cycle,
    route_key: row.routeKey,
    client_name: row.clientName,
    planning_period: row.planningPeriod,
    owner_display_name: row.ownerDisplayName,
    cycle_label: cycleLabel,
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
          routeKey: randomBytes(18).toString("base64url"),
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

    async findByRouteKey({ tenantId, routeKey }) {
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
            eq(taxPlanCycleTable.routeKey, routeKey),
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
//1
    async transition({ tenantId, caseId, toStage, actor }) {
      return await db.transaction(async (tx) => {
        const rows = await tx
          .select({
            id: taxPlanCycleTable.id,
            routeKey: taxPlanCycleTable.routeKey,
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

        const updatedRows = await tx
          .update(taxPlanCycleTable)
          .set({
            stage: toStage,
          })
          .where(
            and(
              eq(taxPlanCycleTable.tenantId, tenantId),
              eq(taxPlanCycleTable.id, caseId),
              eq(taxPlanCycleTable.onHold, false),
            ),
          )
          .returning({ id: taxPlanCycleTable.id });

        if (updatedRows.length === 0) {
          throw new TaxPlanCycleOnHoldError();
        }

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

    async setHoldStatus({ tenantId, caseId, onHold, holdReason }) {
      const rows = await db
        .update(taxPlanCycleTable)
        .set({
          onHold,
          holdReason: onHold ? (holdReason ?? null) : null,
        })
        .where(
          and(
            eq(taxPlanCycleTable.tenantId, tenantId),
            eq(taxPlanCycleTable.id, caseId),
          ),
        )
        .returning({
          id: taxPlanCycleTable.id,
          clientId: taxPlanCycleTable.clientId,
          stage: taxPlanCycleTable.stage,
          owner: taxPlanCycleTable.owner,
          priority: taxPlanCycleTable.priority,
          dueDate: taxPlanCycleTable.dueDate,
          onHold: taxPlanCycleTable.onHold,
          holdReason: taxPlanCycleTable.holdReason,
        });

      const row = rows[0];
      return row ? toTaxPlanCycle(row) : null;
    },

    async listQueue({ tenantId, asOfDate = todayIsoDate() }) {
      const [rows, latestTransitions, earliestEvents, tenantUsers] = await Promise.all([
        db
          .select({
            id: taxPlanCycleTable.id,
            routeKey: taxPlanCycleTable.routeKey,
            clientId: taxPlanCycleTable.clientId,
            clientName: clientRosterTable.clientName,
            planningPeriod: taxPlanCycleTable.planningPeriod,
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
        db
          .select({
            caseId: auditEntryTable.caseId,
            createdAt: min(auditEntryTable.occurredAt),
          })
          .from(auditEntryTable)
          .innerJoin(taxPlanCycleTable, eq(taxPlanCycleTable.id, auditEntryTable.caseId))
          .where(eq(taxPlanCycleTable.tenantId, tenantId))
          .groupBy(auditEntryTable.caseId),
        db
          .select({ id: usersTable.id, displayName: usersTable.displayName })
          .from(usersTable)
          .where(eq(usersTable.tenantId, tenantId)),
      ]);
      const latestTransitionByCaseId = new Map(
        latestTransitions.map((row) => [row.caseId, row.updatedAt ?? null]),
      );
      const earliestEventByCaseId = new Map(
        earliestEvents.map((row) => [row.caseId, row.createdAt ?? null]),
      );
      const userNameById = new Map(tenantUsers.map((user) => [user.id, user.displayName]));
      const cycleLabelById = buildTaxPlanCycleLabels(rows.map((row) => ({
        id: row.id,
        clientKey: row.clientId,
        clientName: row.clientName,
        planningPeriod: row.planningPeriod,
        earliestEventAt: earliestEventByCaseId.get(row.id),
      })));

      return rows.map((row) =>
        toTaxPlanCycleQueueItem(
          {
            ...row,
            ownerDisplayName: userNameById.get(row.owner) ?? displayPersonName(row.owner),
          },
          asOfDate,
          latestTransitionByCaseId.get(row.id) ?? null,
          cycleLabelById.get(row.id) ?? "Client unavailable · Planning period unavailable Tax Plan",
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
