import { describe, expect, test } from "vitest";

import { createTenantLoginResolver } from "../../src/typescript/tenantLoginResolver.js";
import { withDrizzleTestSchema } from "./bootstrap/migrationTestUtils.js";

const databaseUrl = process.env.DATABASE_URL?.trim();
const describeResolver = databaseUrl ? describe : describe.skip;

describeResolver("tenant login resolver", () => {
  test("resolves only the matching active tenant", async () => {
    await withDrizzleTestSchema(async (client) => {
      await client.query(`
        INSERT INTO tenants (id, name, login_slug, is_active) VALUES
          ('018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71', 'Active Tenant', 'active-tenant', true),
          ('018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d72', 'Inactive Tenant', 'inactive-tenant', false)
      `);

      const resolver = createTenantLoginResolver(client);

      await expect(resolver.findActiveTenantByLoginSlug("active-tenant")).resolves.toEqual({
        tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71",
        loginSlug: "active-tenant",
      });
      await expect(resolver.findActiveTenantByLoginSlug("inactive-tenant")).resolves.toBeNull();
      await expect(resolver.findActiveTenantByLoginSlug("unknown-tenant")).resolves.toBeNull();
    });
  });
});
