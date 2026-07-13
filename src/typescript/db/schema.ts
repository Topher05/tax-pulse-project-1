import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  integer,
  text,
  timestamp,
  uniqueIndex,
  varchar,
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

export const roleNameEnum = pgEnum("user_role_name", [
  "Firm Admin",
  "Advisor",
  "Client",
  "TaxPulse Platform Admin",
]);

export const userStatusEnum = pgEnum("user_status_value", [
  "invited",
  "active",
  "disabled",
]);

export const roles = pgTable(
  "roles",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    role: roleNameEnum("role").notNull(),
  },
  (table) => [uniqueIndex("roles_role_key").on(table.role)],
);

export const userStatus = pgTable(
  "user_status",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    status: userStatusEnum("status").notNull(),
  },
  (table) => [uniqueIndex("user_status_status_key").on(table.status)],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    email: text("email").notNull(),
    roleId: integer("role_id").notNull(),
    statusId: integer("status_id").notNull(),
  },
  (table) => [
    foreignKey({
      name: "users_tenant_id_fk",
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
    }),
    foreignKey({
      name: "users_role_id_fk",
      columns: [table.roleId],
      foreignColumns: [roles.id],
    }),
    foreignKey({
      name: "users_status_id_fk",
      columns: [table.statusId],
      foreignColumns: [userStatus.id],
    }),
    uniqueIndex("users_tenant_id_email_key").on(table.tenantId, table.email),
  ],
);

export const credential = pgTable(
  "credential",
  {
    id: varchar("id", { length: 25 }).primaryKey(),
    userId: uuid("userId").notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "credential_userId_fk",
      columns: [table.userId],
      foreignColumns: [users.id],
    }),
    uniqueIndex("credential_userId_key").on(table.userId),
  ],
);

export const mfaEnrollment = pgTable(
  "mfa_enrollment",
  {
    userId: uuid("userId").primaryKey(),
    totpSecret: varchar("totpSecret", { length: 512 }).notNull(),
    isEnrolled: boolean("isEnrolled").default(false).notNull(),
  },
  (table) => [
    foreignKey({
      name: "mfa_enrollment_userId_fk",
      columns: [table.userId],
      foreignColumns: [users.id],
    }),
  ],
);

export const taxPlanCycle = pgTable(
  "tax_plan_cycle",
  {
    id: uuid("id").default(sql`uuidv7()`).notNull(),
    clientId: uuid("client_id").notNull(),
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
      name: "tax_plan_cycle_id_pk",
      columns: [table.id],
    }),
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
    id: uuid("id").default(sql`uuidv7()`).notNull(),
    caseId: uuid("case_id").notNull(),
    fromStage: text("from_stage").notNull(),
    toStage: text("to_stage").notNull(),
    actor: text("actor").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({
      name: "stage_transition_id_pk",
      columns: [table.id],
    }),
    foreignKey({
      name: "stage_transition_case_id_fk",
      columns: [table.caseId],
      foreignColumns: [taxPlanCycle.id],
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
