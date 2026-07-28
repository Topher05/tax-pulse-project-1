import { verify } from "argon2";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, test } from "vitest";

import {
  RegistrationEmailConflictError,
  createRegistrationAccountRepository,
  createRegistrationService,
} from "../../src/typescript/index.js";
import { credential, users } from "../../src/typescript/shared/database/schema.js";
import { credentialRows, userRows } from "../../src/typescript/shared/database/seed.model.js";
import { withDockerDrizzleSeededDatabase } from "./bootstrap/migrationTestUtils.js";
import { fastPasswordHashConfig } from "./auth/auth.test.model.js";

const password = "synthetic-registration-password";
const newClientEmail = "new-client@example.com";
const rollbackUserId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d70";

describe("registration database integration", () => {
  test("persists a hash atomically and enforces tenant-scoped email uniqueness", { timeout: 90_000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const firstTenant = userRows[0];
      const secondTenant = userRows[1];
      const existingCredential = credentialRows[0];

      if (!firstTenant || !secondTenant || !existingCredential) {
        throw new Error("Expected synthetic seeded registration data.");
      }

      const db = drizzle(client);
      const service = createRegistrationService({
        store: createRegistrationAccountRepository(client),
        hashPasswordOptions: { config: fastPasswordHashConfig },
      });

      const account = await service.register({
        tenant_id: firstTenant.tenantId,
        email: newClientEmail,
        password,
      });
      const storedCredentials = await db
        .select({ passwordHash: credential.passwordHash })
        .from(credential)
        .where(eq(credential.userId, account.id));

      expect(account).toEqual({
        id: account.id,
        tenant_id: firstTenant.tenantId,
        email: newClientEmail,
        role: "Client",
        status: "invited",
      });
      expect(Object.keys(account).sort()).toEqual([
        "email",
        "id",
        "role",
        "status",
        "tenant_id",
      ]);
      expect(storedCredentials).toHaveLength(1);
      expect(storedCredentials[0]?.passwordHash).toMatch(/^\$argon2id\$/);
      expect(storedCredentials[0]?.passwordHash).not.toContain(password);
      await expect(verify(storedCredentials[0]!.passwordHash, password)).resolves.toBe(true);

      await expect(
        service.register({
          tenant_id: firstTenant.tenantId,
          email: newClientEmail,
          password,
        }),
      ).rejects.toBeInstanceOf(RegistrationEmailConflictError);

      const otherTenantAccount = await service.register({
        tenant_id: secondTenant.tenantId,
        email: newClientEmail,
        password,
      });
      expect(otherTenantAccount.tenant_id).toBe(secondTenant.tenantId);

      const rollbackService = createRegistrationService({
        store: createRegistrationAccountRepository(client),
        hashPasswordOptions: { config: fastPasswordHashConfig },
        createUserId: () => rollbackUserId,
        createCredentialId: () => existingCredential.id,
      });
      await expect(
        rollbackService.register({
          tenant_id: firstTenant.tenantId,
          email: "rollback-client@example.com",
          password,
        }),
      ).rejects.toThrow();

      const rolledBackUser = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.id, rollbackUserId),
            eq(users.tenantId, firstTenant.tenantId),
          ),
        );
      expect(rolledBackUser).toEqual([]);
    });
  });
});
