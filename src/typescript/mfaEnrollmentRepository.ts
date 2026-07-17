import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import { mfaEnrollment, roles, users } from "./db/schema.js";
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
        .where(and(eq(users.tenantId, tenantId), eq(users.id, userId)))
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
      await db
        .update(mfaEnrollment)
        .set({ isEnrolled: true })
        .where(eq(mfaEnrollment.userId, userId));
    },
  };
}
