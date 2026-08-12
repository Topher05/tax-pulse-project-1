import { describe, expect, test } from "vitest";

import {
  createPlatformAdministrationRepository,
} from "../../../src/typescript/index.js";
import { tenantRows } from "../../../src/typescript/shared/database/seed.model.js";
import { withDockerDrizzleSeededDatabase } from "../bootstrap/migrationTestUtils.js";

describe("Platform administration repository", () => {
  test("lists all tenants with users grouped under each tenant", { timeout: 60000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const repository = createPlatformAdministrationRepository(client);

      await expect(repository.listTenantsWithUsers()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: tenantRows[0].id,
            name: "North Shore Advisors",
            users: expect.arrayContaining([
              expect.objectContaining({
                name: "Alex Rivera",
                role: "Firm Admin",
              }),
              expect.objectContaining({
                name: "Avery Chen",
                role: "Client",
              }),
            ]),
          }),
          expect.objectContaining({
            id: tenantRows[1].id,
            name: "Harbor View Planning",
            users: expect.arrayContaining([
              expect.objectContaining({
                name: "Brianna Cole",
                role: "Advisor",
              }),
              expect.objectContaining({
                name: "Riley Khan",
                role: "Client",
              }),
            ]),
          }),
        ]),
      );
    });
  });

  test("creates a user under the selected tenant", { timeout: 60000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const repository = createPlatformAdministrationRepository(client);

      await expect(
        repository.createTenantUser({
          tenantId: tenantRows[0].id,
          displayName: "Jordan Client",
          email: "jordan.client@example.test",
          role: "Client",
          status: "Inactive",
        }),
      ).resolves.toMatchObject({
        name: "Jordan Client",
        email: "jordan.client@example.test",
        role: "Client",
        status: "Inactive",
        lastLoginAt: null,
      });

      await expect(repository.listTenantsWithUsers()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: tenantRows[0].id,
            users: expect.arrayContaining([
              expect.objectContaining({
                name: "Jordan Client",
                email: "jordan.client@example.test",
              }),
            ]),
          }),
        ]),
      );
    });
  });
});
