import type { Client } from "pg";
import { asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, test } from "vitest";

import { mfaEnrollment } from "../../../src/typescript/db/schema.js";
import { withDockerDrizzleSeededDatabase } from "../bootstrap/migrationTestUtils.js";
import { getTableStructure, expectPgError } from "../bootstrap/tableTestUtils.js";
import {
  expectedMfaEnrollmentColumnTypes,
  expectedMfaEnrollmentColumns,
  expectedMfaEnrollmentRows,
  mfaEnrollmentRows,
  mfaEnrollmentRowsSchema,
} from "./mfa_enrollement.test.model.js";

async function stubMfaEnrollmentState(_client: Client): Promise<void> {
  return;
}

async function withMfaEnrollmentDatabase<T>(
  callback: (client: Client) => Promise<T>,
): Promise<T> {
  return withDockerDrizzleSeededDatabase(async (client) => {
    await stubMfaEnrollmentState(client);
    return callback(client);
  });
}

describe("mfa enrollment module", () => {
  test("tracks the mfa enrollment table contract and seeded rows", { timeout: 30000 }, async () => {
    await withMfaEnrollmentDatabase(async (client) => {
      const db = drizzle(client);
      const structure = await getTableStructure(client, "mfa_enrollment");

      expect(structure.columns).toEqual(expectedMfaEnrollmentColumns);
      expect(structure.columnTypes).toEqual(expectedMfaEnrollmentColumnTypes);
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
    });
  });

  test("rejects duplicate enrollments and missing users", { timeout: 30000 }, async () => {
    await withMfaEnrollmentDatabase(async (client) => {
      const db = drizzle(client);

      await expectPgError(
        db.insert(mfaEnrollment).values({
          userId: mfaEnrollmentRows[0].userId,
          totpSecret: "BASE32SECRETBASE32SECRETBASE32SE",
          isEnrolled: true,
        }),
        { code: "23505", constraint: "mfa_enrollment_pkey" },
      );
      await expectPgError(
        db.insert(mfaEnrollment).values({
          userId: "00000000-0000-0000-0000-000000000001",
          totpSecret: "BASE32SECRETBASE32SECRETBASE32SF",
          isEnrolled: true,
        }),
        { code: "23503", constraint: "mfa_enrollment_userId_fk" },
      );
    });
  });
});
