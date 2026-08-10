import { asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import { serializeAuditEntryForOutput } from "../../auditEntryOutput.js";
import {
  auditEntry as auditEntryTable,
  roles,
  taxPlanCycle,
  tenants,
  users,
  userStatus,
} from "../../shared/database/schema.js";
import {
  platformAuditLogEntrySchema,
  platformPermissionMatrixResponseSchema,
  platformTenantUserRowSchema,
  platformTenantUsersTenantSchema,
  type PlatformAuditLogEntry,
  type PlatformPermissionMatrixResponse,
  type PlatformTenantUserCreateRequest,
  type PlatformTenantUserRow,
  type PlatformTenantUsersTenant,
} from "./platformAdministration.js";

const tenantEmailUniqueConstraint = "users_tenant_id_email_key";
const userTenantForeignKeyConstraint = "users_tenant_id_fk";

interface PostgresError {
  code?: string;
  constraint?: string;
  cause?: unknown;
}

export class PlatformTenantUserEmailConflictError extends Error {
  constructor() {
    super("An account with this email is already registered for the tenant.");
    this.name = "PlatformTenantUserEmailConflictError";
  }
}

export interface PlatformTenantUserCreateInput extends PlatformTenantUserCreateRequest {
  tenantId: string;
}

export interface PlatformAdministrationRepository {
  listTenantsWithUsers(): Promise<PlatformTenantUsersTenant[]>;
  createTenantUser(input: PlatformTenantUserCreateInput): Promise<PlatformTenantUserRow | null>;
  listPermissionMatrix(): Promise<PlatformPermissionMatrixResponse>;
  listPlatformAuditLog(): Promise<PlatformAuditLogEntry[]>;
}

const platformPermissionMatrix = platformPermissionMatrixResponseSchema.parse([
  {
    id: "internal-firm-staff",
    title: "Internal - Firm Staff",
    description:
      "An Advisor cannot sign off their own work; Firm Admin review is required before a plan is presented or sealed.",
    roles: ["TaxPulse Platform Admin", "Firm Admin", "Advisor", "Client"],
    rows: [
      {
        feature: "Plan Cycle Queue",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": "Full",
          Advisor: "Scoped",
          Client: null,
        },
      },
      {
        feature: "Plan Cycle Detail",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": "Full",
          Advisor: "Edit",
          Client: null,
        },
      },
      {
        feature: "Data Aggregation Run",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": "Full",
          Advisor: "Edit",
          Client: null,
        },
      },
      {
        feature: "Scenario Modeling",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": "Full",
          Advisor: "Edit",
          Client: null,
        },
      },
      {
        feature: "Submit for Review",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": "Full",
          Advisor: "Edit",
          Client: null,
        },
      },
      {
        feature: "Review Sign-Off / Send Back",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": "Full",
          Advisor: null,
          Client: null,
        },
      },
      {
        feature: "Present / Client Approval",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": "Full",
          Advisor: "Edit",
          Client: null,
        },
      },
      {
        feature: "Action Item Tracking",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": "Full",
          Advisor: "Edit",
          Client: null,
        },
      },
      {
        feature: "Client Comms / Scheduling",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": "Full",
          Advisor: "Edit",
          Client: null,
        },
      },
      {
        feature: "Place / Release Hold",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": "Full",
          Advisor: null,
          Client: null,
        },
      },
      {
        feature: "Close & Seal (Archived)",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": "Full",
          Advisor: null,
          Client: null,
        },
      },
      {
        feature: "User Management",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": "Full",
          Advisor: null,
          Client: null,
        },
      },
      {
        feature: "Audit Trail",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": "Full",
          Advisor: null,
          Client: null,
        },
      },
    ],
  },
  {
    id: "external-clients",
    title: "External - Clients",
    roles: ["TaxPulse Platform Admin", "Firm Admin", "Advisor", "Client"],
    rows: [
      {
        feature: "Client Portal Dashboard",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": null,
          Advisor: null,
          Client: "Full",
        },
      },
      {
        feature: "View Plan Cycle Stage",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": null,
          Advisor: null,
          Client: "Full",
        },
      },
      {
        feature: "View Scenarios",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": null,
          Advisor: null,
          Client: "Full",
        },
      },
      {
        feature: "Approve Recommendation",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": null,
          Advisor: null,
          Client: "Edit",
        },
      },
      {
        feature: "Mark Action Item Complete",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": null,
          Advisor: null,
          Client: "Edit",
        },
      },
      {
        feature: "Message Advisor",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": null,
          Advisor: null,
          Client: "Edit",
        },
      },
    ],
  },
]);

function isTenantEmailConflict(error: unknown): boolean {
  return hasPostgresError(error, "23505", tenantEmailUniqueConstraint);
}

function isTenantNotFound(error: unknown): boolean {
  return hasPostgresError(error, "23503", userTenantForeignKeyConstraint);
}

function hasPostgresError(error: unknown, code: string, constraint: string): boolean {
  let candidate: unknown = error;
  const visited = new Set<object>();

  while (candidate && typeof candidate === "object") {
    if (visited.has(candidate)) {
      return false;
    }
    visited.add(candidate);

    const postgresError = candidate as PostgresError;
    if (
      postgresError.code === code &&
      postgresError.constraint === constraint
    ) {
      return true;
    }

    candidate = postgresError.cause;
  }

  return false;
}

function toFirmUserStatus(status: "invited" | "active" | "disabled"): "Active" | "Inactive" {
  return status === "active" ? "Active" : "Inactive";
}

function toUserStatusValue(status: "Active" | "Inactive"): "active" | "invited" {
  return status === "Active" ? "active" : "invited";
}

function toPlatformTenantUserRow(row: {
  id: string;
  displayName: string;
  email: string;
  role: "Firm Admin" | "Advisor" | "Client" | "TaxPulse Platform Admin";
  status: "invited" | "active" | "disabled";
  lastLoginAt: Date | null;
}): PlatformTenantUserRow {
  return platformTenantUserRowSchema.parse({
    id: row.id,
    name: row.displayName,
    email: row.email,
    role: row.role,
    status: toFirmUserStatus(row.status),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
  });
}

function inferAuditRole(actor: string): PlatformAuditLogEntry["role"] {
  const normalizedActor = actor.toLowerCase();

  if (normalizedActor.includes("firm-admin")) {
    return "Firm Admin";
  }

  if (normalizedActor.includes("advisor")) {
    return "Advisor";
  }

  if (normalizedActor.includes("client")) {
    return "Client";
  }

  if (normalizedActor.includes("platform")) {
    return "TaxPulse Platform Admin";
  }

  return null;
}

function toPlatformAuditLogEntry(row: {
  id: string;
  caseId: string;
  actor: string;
  action: string;
  outcome: string;
  occurredAt: Date;
  tenantName: string | null;
  planningPeriod: string | null;
}): PlatformAuditLogEntry {
  const serialized = serializeAuditEntryForOutput(row);
  const resourceParts = [
    row.tenantName,
    row.planningPeriod,
    `Case ${row.caseId}`,
  ].filter((part): part is string => part !== null && part !== "");

  return platformAuditLogEntrySchema.parse({
    id: serialized.id,
    occurredAt: serialized.occurred_at,
    user: serialized.actor,
    role: inferAuditRole(serialized.actor),
    action:
      serialized.outcome === "succeeded"
        ? serialized.action
        : `${serialized.action} - ${serialized.outcome}`,
    resource: resourceParts.join(" - "),
  });
}

export function createPlatformAdministrationRepository(
  client: Client,
): PlatformAdministrationRepository {
  const db = drizzle(client);

  return {
    async listPermissionMatrix() {
      return platformPermissionMatrix;
    },

    async listPlatformAuditLog() {
      const rows = await db
        .select({
          id: auditEntryTable.id,
          caseId: auditEntryTable.caseId,
          actor: auditEntryTable.actor,
          action: auditEntryTable.action,
          outcome: auditEntryTable.outcome,
          occurredAt: auditEntryTable.occurredAt,
          tenantName: tenants.name,
          planningPeriod: taxPlanCycle.planningPeriod,
        })
        .from(auditEntryTable)
        .innerJoin(taxPlanCycle, eq(taxPlanCycle.id, auditEntryTable.caseId))
        .leftJoin(tenants, eq(tenants.id, taxPlanCycle.tenantId))
        .orderBy(desc(auditEntryTable.occurredAt));

      return rows.map(toPlatformAuditLogEntry);
    },

    async listTenantsWithUsers() {
      const rows = await db
        .select({
          tenantId: tenants.id,
          tenantName: tenants.name,
          loginSlug: tenants.loginSlug,
          isActive: tenants.isActive,
          userId: users.id,
          displayName: users.displayName,
          email: users.email,
          role: roles.role,
          status: userStatus.status,
          lastLoginAt: users.lastLoginAt,
        })
        .from(tenants)
        .leftJoin(users, eq(users.tenantId, tenants.id))
        .leftJoin(roles, eq(users.roleId, roles.id))
        .leftJoin(userStatus, eq(users.statusId, userStatus.id))
        .orderBy(asc(tenants.name), asc(users.displayName), asc(users.email));

      const groupedTenants = new Map<string, PlatformTenantUsersTenant>();

      for (const row of rows) {
        const tenant =
          groupedTenants.get(row.tenantId) ??
          platformTenantUsersTenantSchema.parse({
            id: row.tenantId,
            name: row.tenantName,
            loginSlug: row.loginSlug,
            isActive: row.isActive,
            users: [],
          });

        if (!groupedTenants.has(row.tenantId)) {
          groupedTenants.set(row.tenantId, tenant);
        }

        if (
          row.userId !== null &&
          row.displayName !== null &&
          row.email !== null &&
          row.role !== null &&
          row.status !== null
        ) {
          tenant.users.push(
            toPlatformTenantUserRow({
              id: row.userId,
              displayName: row.displayName,
              email: row.email,
              role: row.role,
              status: row.status,
              lastLoginAt: row.lastLoginAt,
            }),
          );
        }
      }

      return [...groupedTenants.values()];
    },

    async createTenantUser(input) {
      const [roleRows, statusRows] = await Promise.all([
        db.select({ id: roles.id }).from(roles).where(eq(roles.role, input.role)).limit(1),
        db
          .select({ id: userStatus.id })
          .from(userStatus)
          .where(eq(userStatus.status, toUserStatusValue(input.status)))
          .limit(1),
      ]);
      const roleRow = roleRows[0];
      const statusRow = statusRows[0];

      if (roleRow === undefined || statusRow === undefined) {
        throw new Error("Platform administration user defaults are not configured.");
      }

      try {
        const insertedRows = await db
          .insert(users)
          .values({
            tenantId: input.tenantId,
            displayName: input.displayName,
            email: input.email,
            roleId: roleRow.id,
            statusId: statusRow.id,
          })
          .returning({
            id: users.id,
            displayName: users.displayName,
            email: users.email,
            lastLoginAt: users.lastLoginAt,
          });
        const insertedRow = insertedRows[0];

        if (insertedRow === undefined) {
          return null;
        }

        return platformTenantUserRowSchema.parse({
          id: insertedRow.id,
          name: insertedRow.displayName,
          email: insertedRow.email,
          role: input.role,
          status: input.status,
          lastLoginAt: insertedRow.lastLoginAt?.toISOString() ?? null,
        });
      } catch (error) {
        if (isTenantEmailConflict(error)) {
          throw new PlatformTenantUserEmailConflictError();
        }

        if (isTenantNotFound(error)) {
          return null;
        }

        throw error;
      }
    },
  };
}
