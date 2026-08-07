import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import { roles, users, userStatus } from "../../shared/database/schema.js";
import {
  firmUserRowSchema,
  type FirmUserRow,
  type FirmUserStatus,
} from "./firmUsers.js";

export interface FirmUsersListInput {
  tenantId: string;
}

export interface FirmUsersRepository {
  listByTenant(input: FirmUsersListInput): Promise<FirmUserRow[]>;
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
  };
}
