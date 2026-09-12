import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import { tenants as tenantsTable } from "../../../shared/database/schema.js";

export interface TenantLoginResolution {
  tenantId: string;
  loginSlug: string;
}

export interface TenantLoginResolver {
  findActiveTenantByLoginSlug(loginSlug: string): Promise<TenantLoginResolution | null>;
}

/**
 * Resolves a validated tenant-login slug to the internal tenant identifier.
 * Inactive tenants deliberately do not resolve to prevent new authentication.
 */
export function createTenantLoginResolver(client: Client): TenantLoginResolver {
  const db = drizzle(client);

  return {
    async findActiveTenantByLoginSlug(
      loginSlug: string,
    ): Promise<TenantLoginResolution | null> {
      const rows = await db
        .select({
          tenantId: tenantsTable.id,
          loginSlug: tenantsTable.loginSlug,
        })
        .from(tenantsTable)
        .where(
          and(
            eq(tenantsTable.loginSlug, loginSlug),
            eq(tenantsTable.isActive, true),
          ),
        )
        .limit(1);

      return rows[0] ?? null;
    },
  };
}
