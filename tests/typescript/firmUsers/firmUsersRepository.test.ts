import { describe, expect, test } from "vitest";

import {
  createFirmUsersRepository,
} from "../../../src/typescript/index.js";
import { tenantRows } from "../../../src/typescript/shared/database/seed.model.js";
import { withDockerDrizzleSeededDatabase } from "../bootstrap/migrationTestUtils.js";
import { getTableStructure } from "../bootstrap/tableTestUtils.js";

describe("Firm users repository", () => {
  test("creates the firm user profile table contract", { timeout: 60000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const structure = await getTableStructure(client, "users");

      expect(structure.columns).toEqual([
        "id",
        "tenant_id",
        "email",
        "role_id",
        "status_id",
        "display_name",
        "last_login_at",
      ]);
      expect(structure.columnTypes).toMatchObject({
        display_name: "text",
        last_login_at: "timestamp with time zone",
      });
      expect(structure.indexes).toContain("users_tenant_id_display_name_idx");
    });
  });

  test("lists only the requested tenant's users by display name", { timeout: 60000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const repository = createFirmUsersRepository(client);

      await expect(
        repository.listByTenant({ tenantId: tenantRows[0].id }),
      ).resolves.toEqual([
        {
          id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
          name: "Alex Rivera",
          email: "alex@example.com",
          role: "Firm Admin",
          status: "Inactive",
          lastLoginAt: null,
        },
      ]);

      await expect(
        repository.listByTenant({ tenantId: tenantRows[1].id }),
      ).resolves.toEqual([
        {
          id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
          name: "Brianna Cole",
          email: "brianna@example.com",
          role: "Advisor",
          status: "Active",
          lastLoginAt: "2026-08-05T14:30:00.000Z",
        },
      ]);
    });
  });
});
