import type { Client } from "pg";
import { asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, test } from "vitest";

import { userStatus } from "../../../src/typescript/shared/database/schema.js";
import { withDockerDrizzleSeededDatabase } from "../bootstrap/migrationTestUtils.js";
import { getTableStructure, expectPgError } from "../bootstrap/tableTestUtils.js";
import {
  expectedUserStatusColumnTypes,
  expectedUserStatusColumns,
  userStatusRows,
  userStatusRowsSchema,
} from "./userStatus.test.model.js";

async function stubUserStatusState(_client: Client): Promise<void> {
  return;
}

async function withUserStatusDatabase<T>(
  callback: (client: Client) => Promise<T>,
): Promise<T> {
  return withDockerDrizzleSeededDatabase(async (client) => {
    await stubUserStatusState(client);
    return callback(client);
  });
}

describe("user status module", () => {
  test("tracks the user_status table contract and seeded rows", { timeout: 30000 }, async () => {
    await withUserStatusDatabase(async (client) => {
      const db = drizzle(client);
      const structure = await getTableStructure(client, "user_status");

      expect(structure.columns).toEqual(expectedUserStatusColumns);
      expect(structure.columnTypes).toEqual(expectedUserStatusColumnTypes);
      expect(structure.constraints.user_status_pkey?.type).toBe("p");
      expect(structure.indexes).toContain("user_status_status_key");

      const rows = await db
        .select({
          id: userStatus.id,
          status: userStatus.status,
        })
        .from(userStatus)
        .orderBy(asc(userStatus.id));

      expect(userStatusRowsSchema.parse(rows)).toEqual(userStatusRows);
    });
  });

  test("rejects duplicate lookup values and invalid status values", { timeout: 30000 }, async () => {
    await withUserStatusDatabase(async (client) => {
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
    });
  });
});
