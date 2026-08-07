import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import { roles, tenants, users, userStatus } from "../../shared/database/schema.js";
import {
  platformTenantUserRowSchema,
  platformTenantUsersTenantSchema,
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
}

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

export function createPlatformAdministrationRepository(
  client: Client,
): PlatformAdministrationRepository {
  const db = drizzle(client);

  return {
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
