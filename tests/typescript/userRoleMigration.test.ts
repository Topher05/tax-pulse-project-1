import type { Client } from "pg";
import { describe, expect, test } from "vitest";

import {
  roleNameEnum,
  roles,
  tenants,
  userStatus,
  userStatusEnum,
  users,
} from "../../src/typescript/db/schema.js";
import {
  roleRows,
  tenantRows,
  userRows,
  userStatusRows,
} from "../../src/typescript/db/seed.model.js";
import { quoteIdentifier, withDockerDrizzleSeededDatabase } from "./migrationTestUtils.js";

const expectedTenantColumns = ["id", "name", "created_at"];
const expectedTenantColumnTypes = {
  id: "uuid",
  name: "text",
  created_at: "timestamp with time zone",
} as const;

const expectedRoleColumns = ["id", "role"];
const expectedRoleColumnTypes = {
  id: "integer",
  role: "USER-DEFINED",
} as const;

const expectedUserStatusColumns = ["id", "status"];
const expectedUserStatusColumnTypes = {
  id: "integer",
  status: "USER-DEFINED",
} as const;

const expectedUserColumns = ["id", "tenant_id", "email", "role_id", "status_id"];
const expectedUserColumnTypes = {
  id: "uuid",
  tenant_id: "uuid",
  email: "text",
  role_id: "integer",
  status_id: "integer",
} as const;

type PgErrorLike = {
  code?: string;
  constraint?: string;
  table?: string;
  column?: string;
  message?: string;
};
/*
* Break this file into specific tests on a per-table basis, break the tests between unit and integration
* Tests will have user/user.test.ts, user/user_integration tests etc for user, roles and user status
* Refactor tennants and tennats migration tests as well
 * Confirm drizzle schema accuracy to old migration files
 * Need to have test file cross-ref with new schema
 * Have testcontainer and seeding strategy
 * User and role do not work nicely in drizzle, renaming entity to not match psql keywords
 * Refactor to leverage testContainer templating
 * Add relationship tests for user and role
 * Figure out why drizzle table hook is inoperable (DONE)
 * Update npm notations for applying drizzle commands, update readme as well
 * Review migration setup, what is different
 * Generate new seed, consider faker &/or drizzle-seed
 * Do setup of repository layer for structuring before things scale further
 * Idea: Impose guardrail to prevent the AI from writing direct sql without using drizzle implementation
 * Idea: Expose MCP or llms.txt hook to source documentation for ref for codex
 */
async function getTableStructure(
  client: Client,
  tableName: string,
): Promise<{
  columns: string[];
  columnTypes: Record<string, string>;
  constraints: Record<string, { definition: string; type: string }>;
  indexes: string[];
  rowCount: number;
}> {
  const rowCountResult = await client.query(
    `SELECT count(*)::int AS row_count FROM ${quoteIdentifier(tableName)}`,
  );
  const columnsResult = await client.query(
    `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = $1
      ORDER BY ordinal_position
    `,
    [tableName],
  );
  const constraintsResult = await client.query(
    `
      SELECT conname, contype, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = $1::regclass
    `,
    [tableName],
  );
  const indexesResult = await client.query(
    `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = current_schema()
        AND tablename = $1
      ORDER BY indexname
    `,
    [tableName],
  );

  return {
    rowCount: Number(rowCountResult.rows[0]?.row_count ?? 0),
    columns: columnsResult.rows.map((row) => String(row.column_name)),
    columnTypes: Object.fromEntries(
      columnsResult.rows.map((row) => [
        String(row.column_name),
        String(row.data_type),
      ]),
    ),
    constraints: Object.fromEntries(
      constraintsResult.rows.map((row) => [
        String(row.conname),
        {
          definition: String(row.definition),
          type: String(row.contype),
        },
      ]),
    ),
    indexes: indexesResult.rows.map((row) => String(row.indexname)),
  };
}

async function expectPgError(
  action: Promise<unknown>,
  expected: {
    code: string;
    constraint?: string;
    table?: string;
    column?: string;
    messageIncludes?: string;
  },
): Promise<void> {
  try {
    await action;
  } catch (error) {
    const pgError = error as PgErrorLike;

    expect(pgError.code).toBe(expected.code);
    if (expected.constraint) {
      expect(pgError.constraint).toBe(expected.constraint);
    }
    if (expected.table) {
      expect(pgError.table).toBe(expected.table);
    }
    if (expected.column) {
      expect(pgError.column).toBe(expected.column);
    }
    if (expected.messageIncludes) {
      expect(pgError.message ?? "").toContain(expected.messageIncludes);
    }
    return;
  }

  throw new Error(`Expected query to fail with ${expected.code}`);
}

describe("user, role, and tenant migration", () => {
  test("exports the auth tables and enums", () => {
    expect(tenants).toBeDefined();
    expect(roles).toBeDefined();
    expect(userStatus).toBeDefined();
    expect(users).toBeDefined();
    expect(roleNameEnum.enumValues).toEqual([
      "Firm Admin",
      "Advisor",
      "Client",
      "TaxPulse Platform Admin",
    ]);
    expect(userStatusEnum.enumValues).toEqual(["invited", "active", "disabled"]);
  });

  test("creates tenant, lookup, and user tables with the current Drizzle schema and seeded rows", async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const tenantStructure = await getTableStructure(client, "tenants");
      const roleStructure = await getTableStructure(client, "roles");
      const userStatusStructure = await getTableStructure(client, "user_status");
      const userStructure = await getTableStructure(client, "users");

      expect(tenantStructure.rowCount).toBe(tenantRows.length);
      expect(tenantStructure.columns).toEqual(expectedTenantColumns);
      expect(tenantStructure.columnTypes).toEqual(expectedTenantColumnTypes);
      expect(tenantStructure.constraints.tenants_pkey?.type).toBe("p");
      expect(tenantStructure.constraints.tenants_pkey?.definition).toContain(
        "PRIMARY KEY (id)",
      );

      expect(roleStructure.rowCount).toBe(roleRows.length);
      expect(roleStructure.columns).toEqual(expectedRoleColumns);
      expect(roleStructure.columnTypes).toEqual(expectedRoleColumnTypes);
      expect(roleStructure.constraints.roles_pkey?.type).toBe("p");
      expect(roleStructure.constraints.roles_pkey?.definition).toContain(
        "PRIMARY KEY (id)",
      );
      expect(roleStructure.indexes).toContain("roles_role_key");

      expect(userStatusStructure.rowCount).toBe(userStatusRows.length);
      expect(userStatusStructure.columns).toEqual(expectedUserStatusColumns);
      expect(userStatusStructure.columnTypes).toEqual(
        expectedUserStatusColumnTypes,
      );
      expect(userStatusStructure.constraints.user_status_pkey?.type).toBe("p");
      expect(
        userStatusStructure.constraints.user_status_pkey?.definition,
      ).toContain("PRIMARY KEY (id)");
      expect(userStatusStructure.indexes).toContain("user_status_status_key");

      expect(userStructure.rowCount).toBe(userRows.length);
      expect(userStructure.columns).toEqual(expectedUserColumns);
      expect(userStructure.columnTypes).toEqual(expectedUserColumnTypes);
      expect(userStructure.constraints.users_pkey?.type).toBe("p");
      expect(userStructure.constraints.users_tenant_id_fk?.type).toBe("f");
      expect(userStructure.constraints.users_role_id_fk?.type).toBe("f");
      expect(userStructure.constraints.users_status_id_fk?.type).toBe("f");
      expect(userStructure.indexes).toContain("users_tenant_id_email_key");

      const tenantRowsResult = await client.query(
        `
          SELECT id, name
          FROM tenants
          ORDER BY id
        `,
      );
      expect(tenantRowsResult.rows).toEqual(
        tenantRows.map((row) => ({
          id: row.id,
          name: row.name,
        })),
      );

      const roleRowsResult = await client.query(
        `
          SELECT id, role
          FROM roles
          ORDER BY id
        `,
      );
      expect(roleRowsResult.rows).toEqual(roleRows);

      const userStatusRowsResult = await client.query(
        `
          SELECT id, status
          FROM user_status
          ORDER BY id
        `,
      );
      expect(userStatusRowsResult.rows).toEqual(userStatusRows);

      const userRowsResult = await client.query(
        `
          SELECT id, tenant_id, email, role_id, status_id
          FROM users
          ORDER BY id
        `,
      );
      expect(userRowsResult.rows).toEqual(userRows);
    });
  });

  test("enforces primary keys, unique indexes, foreign keys, and enum column types", async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
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

      await expectPgError(
        client.query(
          `INSERT INTO user_status (id, status) VALUES (1, 'invited')`,
        ),
        { code: "23505", constraint: "user_status_pkey" },
      );
      await expectPgError(
        client.query(
          `INSERT INTO user_status (id, status) VALUES (999, 'invited')`,
        ),
        { code: "23505", constraint: "user_status_status_key" },
      );
      await expectPgError(
        client.query(
          `INSERT INTO user_status (id, status) VALUES (1000, 'archived')`,
        ),
        { code: "22P02", messageIncludes: "invalid input value for enum" },
      );

      await expectPgError(
        client.query(
          `
            INSERT INTO users (
              id,
              tenant_id,
              email,
              role_id,
              status_id
            ) VALUES ($1, $2, $3, $4, $5)
          `,
          [
            "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9dff",
            userRows[0].tenantId,
            userRows[0].email,
            userRows[0].roleId,
            userRows[0].statusId,
          ],
        ),
        { code: "23505", constraint: "users_tenant_id_email_key" },
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
          ["not-a-uuid", "type-bad@example.com", 1, 1],
        ),
        { code: "22P02", messageIncludes: "invalid input syntax for type uuid" },
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
          [userRows[0].tenantId, "type-bad-role@example.com", "bad-role", 1],
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
              role_id,
              status_id
            ) VALUES ($1, $2, $3, $4)
          `,
          [userRows[0].tenantId, "type-bad-status@example.com", 1, "bad-status"],
        ),
        {
          code: "22P02",
          messageIncludes: "invalid input syntax for type integer",
        },
      );
    });
  });
});
