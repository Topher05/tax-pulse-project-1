import type { Client } from "pg";
import { asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, test } from "vitest";

import { withDockerDrizzleSeededDatabase } from "../bootstrap/migrationTestUtils.js";
import { getTableStructure, expectPgError } from "../bootstrap/tableTestUtils.js";
import { roles } from "../../../src/typescript/shared/database/schema.js";
import {
  expectedRoleColumnTypes,
  expectedRoleColumns,
  roleRowsSchema,
  roleRows,
} from "./role.test.model.js";

async function stubRoleState(_client: Client): Promise<void> {
  return;
}

async function withRoleDatabase<T>(
  callback: (client: Client) => Promise<T>,
): Promise<T> {
  return withDockerDrizzleSeededDatabase(async (client) => {
    await stubRoleState(client);
    return callback(client);
  });
}

describe("role module", () => {
  test("tracks the roles table contract and seeded rows", { timeout: 60000 }, async () => {
    await withRoleDatabase(async (client) => {
      const db = drizzle(client);
      const structure = await getTableStructure(client, "roles");

      expect(structure.columns).toEqual(expectedRoleColumns);
      expect(structure.columnTypes).toEqual(expectedRoleColumnTypes);
      expect(structure.constraints.roles_pkey?.type).toBe("p");
      expect(structure.indexes).toContain("roles_role_key");

      const rows = await db
        .select({
          id: roles.id,
          role: roles.role,
        })
        .from(roles)
        .orderBy(asc(roles.id));

      expect(roleRowsSchema.parse(rows)).toEqual(roleRows);
    });
  });

  test("rejects duplicate lookup values and invalid role values", { timeout: 60000 }, async () => {
    await withRoleDatabase(async (client) => {
      const db = drizzle(client);

      await expectPgError(
        db.insert(roles).values({ id: 1, role: "Firm Admin" }),
        { code: "23505", constraint: "roles_pkey" },
      );
      await expectPgError(
        db.insert(roles).values({ id: 999, role: "Firm Admin" }),
        { code: "23505", constraint: "roles_role_key" },
      );
      await expectPgError(
        client.query(`INSERT INTO roles (id, role) VALUES (1000, 'Not a role')`),
        { code: "22P02", messageIncludes: "invalid input value for enum" },
      );
    });
  });
});
