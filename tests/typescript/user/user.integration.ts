import type { Client } from "pg";
import { asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, test } from "vitest";

import { users } from "../../../src/typescript/db/schema.js";
import { withDockerDrizzleSeededDatabase } from "../bootstrap/migrationTestUtils.js";
import { expectPgError, getTableStructure } from "../bootstrap/tableTestUtils.js";
import { expectedUserRows, userRows, userRowsSchema } from "./user.test.model.js";

async function stubUserIntegrationState(_client: Client): Promise<void> {
  return;
}

async function withUserIntegrationDatabase<T>(
  callback: (client: Client) => Promise<T>,
): Promise<T> {
  return withDockerDrizzleSeededDatabase(async (client) => {
    await stubUserIntegrationState(client);
    return callback(client);
  });
}

describe("user integration tests", () => {
  test("tracks user relationships and FK constraints", { timeout: 15000 }, async () => {
    await withUserIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const structure = await getTableStructure(client, "users");

      expect(structure.constraints.users_tenant_id_fk?.type).toBe("f");
      expect(structure.constraints.users_role_id_fk?.type).toBe("f");
      expect(structure.constraints.users_status_id_fk?.type).toBe("f");
      expect(structure.indexes).toContain("users_tenant_id_email_key");

      const rows = await db
        .select({
          id: users.id,
          tenant_id: users.tenantId,
          email: users.email,
          role_id: users.roleId,
          status_id: users.statusId,
        })
        .from(users)
        .orderBy(asc(users.id));

      expect(userRowsSchema.parse(rows)).toEqual(expectedUserRows);
    });
  });

  test("rejects missing tenant, role, and status foreign keys", { timeout: 15000 }, async () => {
    await withUserIntegrationDatabase(async (client) => {
      const db = drizzle(client);

      await expectPgError(
        db.insert(users).values({
          tenantId: "00000000-0000-0000-0000-000000000001",
          email: "new@example.com",
          roleId: 1,
          statusId: 1,
        }),
        { code: "23503", constraint: "users_tenant_id_fk" },
      );
      await expectPgError(
        db.insert(users).values({
          tenantId: userRows[0].tenantId,
          email: "role-missing@example.com",
          roleId: 999,
          statusId: 1,
        }),
        { code: "23503", constraint: "users_role_id_fk" },
      );
      await expectPgError(
        db.insert(users).values({
          tenantId: userRows[0].tenantId,
          email: "status-missing@example.com",
          roleId: 1,
          statusId: 999,
        }),
        { code: "23503", constraint: "users_status_id_fk" },
      );
    });
  });
});
