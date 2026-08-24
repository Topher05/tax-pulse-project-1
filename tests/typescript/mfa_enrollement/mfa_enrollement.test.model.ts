import { z } from "zod";
import { mfaEnrollmentRows as seededMfaEnrollmentRows } from "../../../src/typescript/shared/database/seed.model.js";

export const expectedMfaEnrollmentColumns = ["userId", "totpSecret", "isEnrolled"];
export const expectedMfaEnrollmentColumnTypes = {
  userId: "uuid",
  totpSecret: "character varying",
  isEnrolled: "boolean",
} as const;

const legacyMfaEnrollmentRows = [
  {
    userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
    totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
    isEnrolled: false,
  },
  {
    userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
    totpSecret: "KRSXG5DSNFXGOIDSMVZXI2LOM5XXE3DE",
    isEnrolled: true,
  },
  {
    userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d63",
    totpSecret: "NBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXQ",
    isEnrolled: true,
  },
  {
    userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d64",
    totpSecret: "OVSWY3DPEHPK3PXPJBSWY3DPEHPK3PXR",
    isEnrolled: false,
  },
  {
    userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d65",
    totpSecret: "PBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXS",
    isEnrolled: true,
  },
] as const;

export const mfaEnrollmentRows = seededMfaEnrollmentRows;

export const expectedMfaEnrollmentRows = mfaEnrollmentRows.map((row) => ({
  userId: row.userId,
  totpSecret: row.totpSecret,
  isEnrolled: row.isEnrolled,
}));

export const mfaEnrollmentRowSchema = z.object({
  userId: z.string().uuid(),
  totpSecret: z.string().min(16).max(512),
  isEnrolled: z.boolean(),
});

export const mfaEnrollmentRowsSchema = z.array(mfaEnrollmentRowSchema);
