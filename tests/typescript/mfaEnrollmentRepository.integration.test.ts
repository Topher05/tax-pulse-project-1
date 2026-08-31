import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, test } from "vitest";

import { createMfaEnrollmentRepository } from "../../src/typescript/mfaEnrollmentRepository.js";
import { mfaEnrollment, users, userStatus } from "../../src/typescript/shared/database/schema.js";
import { userRows } from "../../src/typescript/shared/database/seed.model.js";
import { withDockerDrizzleSeededDatabase } from "./bootstrap/migrationTestUtils.js";

describe("MFA enrollment repository integration", () => {
  test("allows invited users to enroll and activates them after confirmation", { timeout: 90_000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const invitedUser = userRows[0];

      if (!invitedUser) {
        throw new Error("Expected synthetic invited user.");
      }

      const repository = createMfaEnrollmentRepository(client);
      const tenantUser = await repository.findTenantUser({
        tenantId: invitedUser.tenantId,
        userId: invitedUser.id,
      });

      expect(tenantUser).toMatchObject({
        id: invitedUser.id,
        email: invitedUser.email,
        tenantId: invitedUser.tenantId,
      });

      await repository.savePendingEnrollment({
        userId: invitedUser.id,
        totpSecret: "FAKEBASE32SECRETFAKEBASE32SECRET",
      });
      await repository.markEnrolled({ userId: invitedUser.id });

      const db = drizzle(client);
      const rows = await db
        .select({
          isEnrolled: mfaEnrollment.isEnrolled,
          status: userStatus.status,
        })
        .from(users)
        .innerJoin(userStatus, eq(users.statusId, userStatus.id))
        .innerJoin(mfaEnrollment, eq(mfaEnrollment.userId, users.id))
        .where(
          and(
            eq(users.tenantId, invitedUser.tenantId),
            eq(users.id, invitedUser.id),
          ),
        );

      expect(rows).toEqual([{ isEnrolled: true, status: "active" }]);
    });
  });

  test("keeps disabled users outside enrollment lookup", { timeout: 90_000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const disabledUser = userRows[4];

      if (!disabledUser) {
        throw new Error("Expected synthetic disabled user.");
      }

      await expect(
        createMfaEnrollmentRepository(client).findTenantUser({
          tenantId: disabledUser.tenantId,
          userId: disabledUser.id,
        }),
      ).resolves.toBeNull();
    });
  });
});
