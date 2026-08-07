import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import { roles, users, userStatus } from "../../shared/database/schema.js";
import {
  firmUserRowSchema,
  type FirmUserRole,
  type FirmUserRow,
  type FirmUserStatus,
} from "./firmUsers.js";

export interface FirmUsersListInput {
  tenantId: string;
}

export interface FirmUserRoleUpdateInput {
  tenantId: string;
  userId: string;
  role: FirmUserRole;
}

export interface FirmUsersRepository {
  listByTenant(input: FirmUsersListInput): Promise<FirmUserRow[]>;
  updateTenantUserRole(input: FirmUserRoleUpdateInput): Promise<FirmUserRow | null>;
}

function toFirmUserStatus(status: "invited" | "active" | "disabled"): FirmUserStatus {
  return status === "active" ? "Active" : "Inactive";
}

function toFirmUserRow(row: {
  id: string;
  displayName: string;
  email: string;
  role: "Firm Admin" | "Advisor" | "Client" | "TaxPulse Platform Admin";
  status: "invited" | "active" | "disabled";
  lastLoginAt: Date | null;
}): FirmUserRow {
  return firmUserRowSchema.parse({
    id: row.id,
    name: row.displayName,
    email: row.email,
    role: row.role,
    status: toFirmUserStatus(row.status),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
  });
}

export function createFirmUsersRepository(client: Client): FirmUsersRepository {
  const db = drizzle(client);

  async function readTenantUserById({
    tenantId,
    userId,
  }: {
    tenantId: string;
    userId: string;
  }): Promise<FirmUserRow | null> {
    const rows = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        role: roles.role,
        status: userStatus.status,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .innerJoin(userStatus, eq(users.statusId, userStatus.id))
      .where(and(eq(users.tenantId, tenantId), eq(users.id, userId)))
      .limit(1);

    return rows[0] === undefined ? null : toFirmUserRow(rows[0]);
  }

  return {
    async listByTenant({ tenantId }) {
      const rows = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          email: users.email,
          role: roles.role,
          status: userStatus.status,
          lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .innerJoin(userStatus, eq(users.statusId, userStatus.id))
        .where(eq(users.tenantId, tenantId))
        .orderBy(asc(users.displayName), asc(users.email));

      return rows.map(toFirmUserRow);
    },
    async updateTenantUserRole({ tenantId, userId, role }) {
      const roleRows = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.role, role))
        .limit(1);
      const roleRow = roleRows[0];

      if (roleRow === undefined) {
        throw new Error(`Role ${role} is not configured.`);
      }

      const updatedRows = await db
        .update(users)
        .set({ roleId: roleRow.id })
        .where(and(eq(users.tenantId, tenantId), eq(users.id, userId)))
        .returning({ id: users.id });

      if (updatedRows[0] === undefined) {
        return null;
      }

      return await readTenantUserById({ tenantId, userId });
    },
  };
}
