import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  integer,
  numeric,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  uuid,
} from "drizzle-orm/pg-core";
import type { ScenarioComputedResult, ScenarioTypedFigures } from "../../scenario.js";
import { taxPlanCycleStages } from "../../features/taxPlanCycle/taxPlanCycle.js";

const stageValuesSql = sql.join(
  taxPlanCycleStages.map((stage) => sql.raw(`'${stage.replace(/'/g, "''")}'`)),
  sql`, `,
);

export const deductionCategoryValues = [
  "Business Expense",
  "Home Office",
  "Charitable Giving",
  "Health & Medical",
  "Education",
  "Retirement Contribution",
  "Other",
] as const;

export const deductionCategoryEnum = pgEnum(
  "deduction_category",
  deductionCategoryValues,
);

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    loginSlug: text("login_slug").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (table) => [
    uniqueIndex("tenants_login_slug_key").on(table.loginSlug),
    check(
      "tenants_login_slug_format_check",
      sql`${table.loginSlug} ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'`,
    ),
  ],
);

export const federalTaxBracket = pgTable(
  "federal_tax_bracket",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    taxYear: integer("tax_year").notNull(),
    filingStatus: text("filing_status").notNull(),
    rate: numeric("rate", { precision: 5, scale: 4 }).notNull(),
    lowerBound: numeric("lower_bound", { precision: 14, scale: 2 }).notNull(),
    upperBound: numeric("upper_bound", { precision: 14, scale: 2 }),
  },
  (table) => [
    uniqueIndex("federal_tax_bracket_year_status_lower_bound_key").on(
      table.taxYear,
      table.filingStatus,
      table.lowerBound,
    ),
    index("federal_tax_bracket_year_status_lower_bound_idx").on(
      table.taxYear,
      table.filingStatus,
      table.lowerBound,
    ),
  ],
);

export const stateTaxBracket = pgTable(
  "state_tax_bracket",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    taxYear: integer("tax_year").notNull(),
    stateCode: varchar("state_code", { length: 2 }).notNull(),
    filingStatus: text("filing_status").notNull(),
    rate: numeric("rate", { precision: 5, scale: 4 }).notNull(),
    lowerBound: numeric("lower_bound", { precision: 14, scale: 2 }).notNull(),
    upperBound: numeric("upper_bound", { precision: 14, scale: 2 }),
  },
  (table) => [
    uniqueIndex("state_tax_bracket_year_state_status_lower_bound_key").on(
      table.taxYear,
      table.stateCode,
      table.filingStatus,
      table.lowerBound,
    ),
    index("state_tax_bracket_year_state_status_lower_bound_idx").on(
      table.taxYear,
      table.stateCode,
      table.filingStatus,
      table.lowerBound,
    ),
  ],
);

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
    displayName: text("display_name").notNull(),
    roleId: integer("role_id").notNull(),
    statusId: integer("status_id").notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
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

export const refreshToken = pgTable(
  "refresh_token",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    userId: uuid("user_id").notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "refresh_token_user_id_fk",
      columns: [table.userId],
      foreignColumns: [users.id],
    }),
    uniqueIndex("refresh_token_token_hash_key").on(table.tokenHash),
    index("refresh_token_user_id_expires_at_idx").on(table.userId, table.expiresAt),
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

export const actionItem = pgTable(
  "action_item",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull(),
    caseId: uuid("case_id").notNull(),
    description: text("description").notNull(),
    deadline: date("deadline").notNull(),
    completed: boolean("completed").default(false).notNull(),
  },
  (table) => [
    primaryKey({
      name: "action_item_id_pk",
      columns: [table.id],
    }),
    foreignKey({
      name: "action_item_case_id_fk",
      columns: [table.caseId],
      foreignColumns: [taxPlanCycle.id],
    }),
    index("action_item_case_id_idx").on(table.caseId),
  ],
);

export const clientRoster = pgTable(
  "client_roster",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    clientName: text("client_name").notNull(),
    filingStatus: text("filing_status").notNull(),
    ytdIncome: numeric("ytd_income", { precision: 14, scale: 2 }).notNull(),
    estimatedTax: numeric("estimated_tax", { precision: 14, scale: 2 }).notNull(),
    quarterlyStatus: text("quarterly_status"),
  },
  (table) => [
    foreignKey({
      name: "client_roster_tenant_id_fk",
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
    }),
    check(
      "client_roster_ytd_income_nonnegative_check",
      sql`${table.ytdIncome} >= 0`,
    ),
    check(
      "client_roster_estimated_tax_nonnegative_check",
      sql`${table.estimatedTax} >= 0`,
    ),
    index("client_roster_tenant_id_client_name_idx").on(
      table.tenantId,
      table.clientName,
    )
  ],
);

export const scenario = pgTable(
  "scenario",
  {
    id: uuid("id").default(sql`uuidv7()`).notNull(),
    caseId: uuid("case_id").notNull(),
    name: text("name").notNull(),
    typedFigures: jsonb("typed_figures").$type<ScenarioTypedFigures>().notNull(),
    computedResult: jsonb("computed_result")
      .$type<ScenarioComputedResult>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      name: "scenario_id_pk",
      columns: [table.id],
    }),
    foreignKey({
      name: "scenario_case_id_fk",
      columns: [table.caseId],
      foreignColumns: [taxPlanCycle.id],
    }),
    uniqueIndex("scenario_case_id_name_key").on(table.caseId, table.name),
    index("scenario_case_id_idx").on(table.caseId),
  ],
);

export const deduction = pgTable(
  "deduction",
  {
    id: uuid("id").default(sql`uuidv7()`).notNull(),
    caseId: uuid("case_id").notNull(),
    date: date("date").notNull(),
    description: text("description").notNull(),
    category: deductionCategoryEnum("category").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    taxImpact: numeric("tax_impact", { precision: 14, scale: 2 }).notNull(),
    deleted: boolean("deleted").default(false).notNull(),
  },
  (table) => [
    primaryKey({
      name: "deduction_id_pk",
      columns: [table.id],
    }),
    foreignKey({
      name: "deduction_case_id_fk",
      columns: [table.caseId],
      foreignColumns: [taxPlanCycle.id],
    }),
    index("deduction_case_id_deleted_idx").on(table.caseId, table.deleted),
    index("deduction_case_id_date_idx").on(table.caseId, table.date),
  ],
);

export const auditEntry = pgTable(
  "audit_entry",
  {
    id: uuid("id").default(sql`uuidv7()`).notNull(),
    caseId: uuid("case_id").notNull(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    outcome: text("outcome").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "audit_entry_id_pk",
      columns: [table.id],
    }),
    foreignKey({
      name: "audit_entry_case_id_fk",
      columns: [table.caseId],
      foreignColumns: [taxPlanCycle.id],
    }),
    index("audit_entry_case_id_occurred_at_idx").on(
      table.caseId,
      table.occurredAt,
    ),
  ],
);

export const outboxEvent = pgTable(
  "outbox_event",
  {
    id: uuid("id").default(sql`uuidv7()`).notNull(),
    payload: text("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({
      name: "outbox_event_id_pk",
      columns: [table.id],
    }),
  ],
);

export const outboxDeadLetter = pgTable(
  "outbox_dead_letter",
  {
    id: uuid("id").default(sql`uuidv7()`).notNull(),
    outboxEventId: uuid("outbox_event_id").notNull(),
    payload: text("payload").notNull(),
    failureReason: text("failure_reason").notNull(),
    failedAt: timestamp("failed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "outbox_dead_letter_id_pk",
      columns: [table.id],
    }),
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
