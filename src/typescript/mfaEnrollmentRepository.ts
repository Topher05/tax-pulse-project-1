import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import { mfaEnrollment, roles, users, userStatus } from "./shared/database/schema.js";
import type {
  MfaEnrollmentRecord,
  MfaEnrollmentRepository,
  MfaTenantUser,
} from "./mfaEnrollment.js";

export function createMfaEnrollmentRepository(
  client: Client,
): MfaEnrollmentRepository {
  const db = drizzle(client);

  return {
    async findTenantUser({ tenantId, userId }) {
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          tenantId: users.tenantId,
          role: roles.role,
        })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .innerJoin(userStatus, eq(users.statusId, userStatus.id))
        .where(
          and(
            eq(users.tenantId, tenantId),
            eq(users.id, userId),
            inArray(userStatus.status, ["active", "invited"]),
          ),
        )
        .limit(1);

      const row: MfaTenantUser | undefined = rows[0];

      return row ?? null;
    },

    async findEnrollment({ userId }) {
      const rows = await db
        .select({
          userId: mfaEnrollment.userId,
          totpSecret: mfaEnrollment.totpSecret,
          isEnrolled: mfaEnrollment.isEnrolled,
        })
        .from(mfaEnrollment)
        .where(eq(mfaEnrollment.userId, userId))
        .limit(1);

      const row: MfaEnrollmentRecord | undefined = rows[0];

      return row ?? null;
    },

    async savePendingEnrollment({ userId, totpSecret }) {
      await db
        .insert(mfaEnrollment)
        .values({
          userId,
          totpSecret,
          isEnrolled: false,
        })
        .onConflictDoUpdate({
          target: mfaEnrollment.userId,
          set: {
            totpSecret,
            isEnrolled: false,
          },
        });
    },

    async markEnrolled({ userId }) {
      await db.transaction(async (transaction) => {
        const activeStatusRows = await transaction
          .select({ id: userStatus.id })
          .from(userStatus)
          .where(eq(userStatus.status, "active"))
          .limit(1);
        const activeStatus = activeStatusRows[0];

        if (!activeStatus) {
          throw new Error("Active user status is not configured in the database.");
        }

        await transaction
          .update(mfaEnrollment)
          .set({ isEnrolled: true })
          .where(eq(mfaEnrollment.userId, userId));

        await transaction
          .update(users)
          .set({ statusId: activeStatus.id })
          .where(eq(users.id, userId));
      });
    },
  };
}
