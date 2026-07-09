import type { Client } from "pg";
import { describe, expect, test } from "vitest";

import { withDockerDrizzleSeededDatabase } from "../bootstrap/migrationTestUtils.js";
import { expectPgError, getTableStructure } from "../bootstrap/tableTestUtils.js";
import { userRows } from "./user.test.model.js";

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

describe.skip("user integration tests", () => {
  test("tracks user relationships and FK constraints", async () => {
    await withUserIntegrationDatabase(async (client) => {
      const structure = await getTableStructure(client, "users");

      expect(structure.constraints.users_tenant_id_fk?.type).toBe("f");
      expect(structure.constraints.users_role_id_fk?.type).toBe("f");
      expect(structure.constraints.users_status_id_fk?.type).toBe("f");
      expect(structure.indexes).toContain("users_tenant_id_email_key");

      const rows = await client.query(
        `
          SELECT id, tenant_id, email, role_id, status_id
          FROM users
          ORDER BY id
        `,
      );

      expect(rows.rows).toEqual(
        userRows.map((row) => ({
          id: row.id,
          tenant_id: row.tenantId,
          email: row.email,
          role_id: row.roleId,
          status_id: row.statusId,
        })),
      );
    });
  });

  test("rejects missing tenant, role, and status foreign keys", async () => {
    await withUserIntegrationDatabase(async (client) => {
      await expectPgError(
        client.query(
          `
            INSERT INTO users (
              tenant_id,
              email,
              role_id,
              status_id
            ) VALUES ($1, $2, $3, $4)
          `,
          ["00000000-0000-0000-0000-000000000001", "new@example.com", 1, 1],
        ),
        { code: "23503", constraint: "users_tenant_id_fk" },
      );
      await expectPgError(
        client.query(
          `
            INSERT INTO users (
              tenant_id,
              email,
              role_id,
              status_id
            ) VALUES ($1, $2, $3, $4)
          `,
          [userRows[0].tenantId, "role-missing@example.com", 999, 1],
        ),
        { code: "23503", constraint: "users_role_id_fk" },
      );
      await expectPgError(
        client.query(
          `
            INSERT INTO users (
              tenant_id,
              email,
              role_id,
              status_id
            ) VALUES ($1, $2, $3, $4)
          `,
          [userRows[0].tenantId, "status-missing@example.com", 1, 999],
        ),
        { code: "23503", constraint: "users_status_id_fk" },
      );
    });
  });
});
