import type { Client } from "pg";
import { describe, expect, test } from "vitest";

import { withDockerDrizzleSeededDatabase } from "../bootstrap/migrationTestUtils.js";
import { getTableStructure, expectPgError } from "../bootstrap/tableTestUtils.js";
import {
  expectedRoleColumnTypes,
  expectedRoleColumns,
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

describe.skip("role module", () => {
  test("tracks the roles table contract and seeded rows", async () => {
    await withRoleDatabase(async (client) => {
      const structure = await getTableStructure(client, "roles");

      expect(structure.columns).toEqual(expectedRoleColumns);
      expect(structure.columnTypes).toEqual(expectedRoleColumnTypes);
      expect(structure.constraints.roles_pkey?.type).toBe("p");
      expect(structure.indexes).toContain("roles_role_key");

      const rows = await client.query(
        `
          SELECT id, role
          FROM roles
          ORDER BY id
        `,
      );

      expect(rows.rows).toEqual(roleRows);
    });
  });

  test("rejects duplicate lookup values and invalid role values", async () => {
    await withRoleDatabase(async (client) => {
      await expectPgError(
        client.query(`INSERT INTO roles (id, role) VALUES (1, 'Firm Admin')`),
        { code: "23505", constraint: "roles_pkey" },
      );
      await expectPgError(
        client.query(`INSERT INTO roles (id, role) VALUES (999, 'Firm Admin')`),
        { code: "23505", constraint: "roles_role_key" },
      );
      await expectPgError(
        client.query(`INSERT INTO roles (id, role) VALUES (1000, 'Not a role')`),
        { code: "22P02", messageIncludes: "invalid input value for enum" },
      );
    });
  });
});
