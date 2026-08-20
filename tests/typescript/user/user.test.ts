import type { Client } from "pg";
import { asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, test } from "vitest";

import { withDockerDrizzleSeededDatabase } from "../bootstrap/migrationTestUtils.js";
import { getTableStructure, expectPgError } from "../bootstrap/tableTestUtils.js";
import {
  tenants,
  userStatus,
  userStatusEnum,
  users,
} from "../../../src/typescript/shared/database/schema.js";
import {
  expectedUserColumnTypes,
  expectedUserColumns,
  userRowsSchema,
  expectedUserRows,
  userRows,
} from "./user.test.model.js";

async function stubUserModuleState(_client: Client): Promise<void> {
  return;
}

async function withUserModuleDatabase<T>(
  callback: (client: Client) => Promise<T>,
): Promise<T> {
  return withDockerDrizzleSeededDatabase(async (client) => {
    await stubUserModuleState(client);
    return callback(client);
  });
}

describe("user module", () => {
  test("exports the user tables and status enum", { timeout: 60000 }, () => {
    expect(tenants).toBeDefined();
    expect(userStatus).toBeDefined();
    expect(users).toBeDefined();
    expect(userStatusEnum.enumValues).toEqual(["invited", "active", "disabled"]);
  });

  test("tracks the users table contract and seeded user rows", { timeout: 60000 }, async () => {
    await withUserModuleDatabase(async (client) => {
      const db = drizzle(client);
      const structure = await getTableStructure(client, "users");

      expect(structure.columns).toEqual(expectedUserColumns);
      expect(structure.columnTypes).toEqual(expectedUserColumnTypes);
      expect(structure.constraints.users_pkey?.type).toBe("p");
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
          display_name: users.displayName,
          last_login_at: users.lastLoginAt,
        })
        .from(users)
        .orderBy(asc(users.id));

      expect(userRowsSchema.parse(rows)).toEqual(expectedUserRows);
    });
  });

  test("rejects duplicate scoped email rows and invalid user column values", { timeout: 60000 }, async () => {
    await withUserModuleDatabase(async (client) => {
      const db = drizzle(client);

      await expectPgError(
        db.insert(users).values({
          tenantId: userRows[0].tenantId,
          email: userRows[0].email,
          displayName: userRows[0].displayName,
          roleId: userRows[0].roleId,
          statusId: userRows[0].statusId,
        }),
        { code: "23505", constraint: "users_tenant_id_email_key" },
      );
      await expectPgError(
        client.query(
          `
            INSERT INTO users (
              tenant_id,
              email,
              display_name,
              role_id,
              status_id
            ) VALUES ($1, $2, $3, $4, $5)
          `,
          ["not-a-uuid", "type-bad@example.com", "Type Bad", 1, 1],
        ),
        { code: "22P02", messageIncludes: "invalid input syntax for type uuid" },
      );
      await expectPgError(
        client.query(
          `
            INSERT INTO users (
              tenant_id,
              email,
              display_name,
              role_id,
              status_id
            ) VALUES ($1, $2, $3, $4, $5)
          `,
          [
            userRows[0].tenantId,
            "type-bad-role@example.com",
            "Type Bad Role",
            "bad-role",
            1,
          ],
        ),
        {
          code: "22P02",
          messageIncludes: "invalid input syntax for type integer",
        },
      );
      await expectPgError(
        client.query(
          `
            INSERT INTO users (
              tenant_id,
              email,
              display_name,
              role_id,
              status_id
            ) VALUES ($1, $2, $3, $4, $5)
          `,
          [
            userRows[0].tenantId,
            "type-bad-status@example.com",
            "Type Bad Status",
            1,
            "bad-status",
          ],
        ),
        {
          code: "22P02",
          messageIncludes: "invalid input syntax for type integer",
        },
      );
    });
  });
});
