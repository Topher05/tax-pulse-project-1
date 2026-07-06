import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { taxPlanCycleStages } from "../taxPlanCycle.js";

const stageValuesSql = sql.join(
  taxPlanCycleStages.map((stage) => sql.raw(`'${stage.replace(/'/g, "''")}'`)),
  sql`, `,
);

export const tenants = pgTable("tenants", {
  id: uuid("id").default(sql`uuidv7()`).primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const taxPlanCycle = pgTable(
  "tax_plan_cycle",
  {
    clientId: uuid("client_id").default(sql`uuidv7()`).notNull(),
    caseId: text("case_id").notNull(),
    tenantId: uuid("tenant_id").notNull(),
    planningPeriod: text("planning_period").notNull(),
    stage: text("stage").notNull(),
    owner: text("owner").notNull(),
    priority: text("priority").notNull(),
    dueDate: date("due_date").notNull(),
    onHold: boolean("on_hold").default(false).notNull(),
    holdReason: text("hold_reason"),
  },
  (table) => [
    primaryKey({
      name: "tax_plan_cycle_client_id_pk",
      columns: [table.clientId],
    }),
    unique("tax_plan_cycle_case_id_key").on(table.caseId),
    foreignKey({
      name: "tax_plan_cycle_tenant_id_fk",
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
    }),
    check("tax_plan_cycle_stage_check", sql`${table.stage} IN (${stageValuesSql})`),
    index("tax_plan_cycle_tenant_id_due_date_idx").on(table.tenantId, table.dueDate),
  ],
);

export const stageTransition = pgTable(
  "stage_transition",
  {
    caseId: text("case_id").notNull(),
    fromStage: text("from_stage").notNull(),
    toStage: text("to_stage").notNull(),
    actor: text("actor").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "stage_transition_case_id_fk",
      columns: [table.caseId],
      foreignColumns: [taxPlanCycle.caseId],
    }),
    check(
      "stage_transition_from_stage_check",
      sql`${table.fromStage} IN (${stageValuesSql})`,
    ),
    check(
      "stage_transition_to_stage_check",
      sql`${table.toStage} IN (${stageValuesSql})`,
    ),
    index("stage_transition_case_id_idx").on(table.caseId),
  ],
);
