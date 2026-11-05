import type { Client } from "pg";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, test } from "vitest";

import { mfaEnrollment, users } from "../../../../../src/typescript/shared/database/schema.js";
import { withDockerDrizzleSeededDatabase } from "../../../bootstrap/migrationTestUtils.js";
import { expectPgError, getTableStructure } from "../../../bootstrap/tableTestUtils.js";
import {
  expectedMfaEnrollmentRows,
  mfaEnrollmentRowSchema,
  mfaEnrollmentRows,
  mfaEnrollmentRowsSchema,
} from "./mfa_enrollement.test.model.js";

async function stubMfaEnrollmentIntegrationState(_client: Client): Promise<void> {
  return;
}

async function withMfaEnrollmentIntegrationDatabase<T>(
  callback: (client: Client) => Promise<T>,
): Promise<T> {
  return withDockerDrizzleSeededDatabase(async (client) => {
    await stubMfaEnrollmentIntegrationState(client);
    return callback(client);
  });
}

describe("mfa enrollment integration tests", () => {
  test("tracks mfa enrollment relationships and default enrollment state", { timeout: 60000 }, async () => {
    await withMfaEnrollmentIntegrationDatabase(async (client) => {
      const db = drizzle(client);
      const structure = await getTableStructure(client, "mfa_enrollment");

      expect(structure.constraints.mfa_enrollment_userId_fk?.type).toBe("f");
      expect(structure.constraints.mfa_enrollment_pkey?.type).toBe("p");

      const rows = await db
        .select({
          userId: mfaEnrollment.userId,
          totpSecret: mfaEnrollment.totpSecret,
          isEnrolled: mfaEnrollment.isEnrolled,
        })
        .from(mfaEnrollment)
        .orderBy(asc(mfaEnrollment.userId));

      expect(mfaEnrollmentRowsSchema.parse(rows)).toEqual(
        expectedMfaEnrollmentRows,
      );

      const insertedUserId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d66";

      await db.insert(users).values({
        id: insertedUserId,
        tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
        email: "mfa-default@example.com",
        displayName: "MFA Default",
        roleId: 2,
        statusId: 2,
      });
      await db.insert(mfaEnrollment).values({
        userId: insertedUserId,
        totpSecret: "QBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXT",
      });

      const insertedRows = await db
        .select({
          userId: mfaEnrollment.userId,
          totpSecret: mfaEnrollment.totpSecret,
          isEnrolled: mfaEnrollment.isEnrolled,
        })
        .from(mfaEnrollment)
        .where(eq(mfaEnrollment.userId, insertedUserId));

      expect(mfaEnrollmentRowSchema.parse(insertedRows[0])).toEqual({
        userId: insertedUserId,
        totpSecret: "QBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXT",
        isEnrolled: false,
      });
    });
  });

  test("rejects duplicate enrollments and missing users", { timeout: 60000 }, async () => {
    await withMfaEnrollmentIntegrationDatabase(async (client) => {
      const db = drizzle(client);

      await expectPgError(
        db.insert(mfaEnrollment).values({
          userId: mfaEnrollmentRows[0].userId,
          totpSecret: "BASE32SECRETBASE32SECRETBASE32SA",
          isEnrolled: true,
        }),
        { code: "23505", constraint: "mfa_enrollment_pkey" },
      );
      await expectPgError(
        db.insert(mfaEnrollment).values({
          userId: "00000000-0000-0000-0000-000000000001",
          totpSecret: "BASE32SECRETBASE32SECRETBASE32SB",
          isEnrolled: true,
        }),
        { code: "23503", constraint: "mfa_enrollment_userId_fk" },
      );
    });
  });
});
