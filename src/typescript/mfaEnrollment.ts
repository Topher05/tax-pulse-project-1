import { generateSecret, generateURI, verify } from "otplib";
import { z } from "zod";

import { ProblemHttpError } from "./errors.js";
import type { UserRole } from "./authTypes.js";

const mfaChallengeContextSchema = z
  .object({
    tenant_id: z.string().uuid().optional(),
    user_id: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.tenant_id === undefined) !== (value.user_id === undefined)
    ) {
      context.addIssue({
        code: "custom",
        message: "tenant_id and user_id must be provided together.",
        path: value.tenant_id === undefined ? ["tenant_id"] : ["user_id"],
      });
    }
  });

export const mfaEnrollRequestSchema = mfaChallengeContextSchema;

export const mfaEnrollConfirmRequestSchema = z
  .object({
    tenant_id: z.string().uuid().optional(),
    user_id: z.string().uuid().optional(),
    code: z.string().regex(/^\d{6}$/, "TOTP code must be exactly 6 digits."),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.tenant_id === undefined) !== (value.user_id === undefined)
    ) {
      context.addIssue({
        code: "custom",
        message: "tenant_id and user_id must be provided together.",
        path: value.tenant_id === undefined ? ["tenant_id"] : ["user_id"],
      });
    }
  });

export const mfaEnrollResultSchema = z.object({
  provisioning_uri: z.string().startsWith("otpauth://totp/"),
});

export const mfaEnrollConfirmResultSchema = z.object({
  enrolled: z.literal(true),
});

export type MfaEnrollRequest = z.infer<typeof mfaEnrollRequestSchema>;
export type MfaEnrollConfirmRequest = z.infer<
  typeof mfaEnrollConfirmRequestSchema
>;
export type MfaEnrollResult = z.infer<typeof mfaEnrollResultSchema>;
export type MfaEnrollConfirmResult = z.infer<
  typeof mfaEnrollConfirmResultSchema
>;

export interface MfaTenantUser {
  id: string;
  email: string;
  tenantId: string;
  role: UserRole;
}

export interface MfaEnrollmentRecord {
  userId: string;
  totpSecret: string;
  isEnrolled: boolean;
}

export interface MfaEnrollmentRepository {
  findTenantUser(input: {
    tenantId: string;
    userId: string;
  }): Promise<MfaTenantUser | null>;
  findEnrollment(input: {
    userId: string;
  }): Promise<MfaEnrollmentRecord | null>;
  savePendingEnrollment(input: {
    userId: string;
    totpSecret: string;
  }): Promise<void>;
  markEnrolled(input: {
    userId: string;
  }): Promise<void>;
}

export interface MfaTotpProvider {
  generateSecret(): string;
  generateProvisioningUri(input: {
    accountLabel: string;
    secret: string;
  }): string;
  verifyCode(input: {
    code: string;
    secret: string;
  }): Promise<boolean>;
}

export interface MfaEnrollmentController {
  enroll(input: {
    tenantId: string;
    userId: string;
  }): Promise<MfaEnrollResult>;
  confirm(input: {
    tenantId: string;
    userId: string;
    code: string;
  }): Promise<MfaEnrollConfirmResult>;
}

export interface CreateMfaEnrollmentControllerOptions {
  issuer?: string;
  repository: MfaEnrollmentRepository;
  totpProvider?: MfaTotpProvider;
}

const defaultMfaIssuer = "TaxPulse Advisory";

export function createDefaultMfaTotpProvider(
  issuer: string = defaultMfaIssuer,
): MfaTotpProvider {
  return {
    generateSecret: () => generateSecret(),
    generateProvisioningUri: ({ accountLabel, secret }) =>
      generateURI({
        issuer,
        label: accountLabel,
        secret,
      }),
    async verifyCode({ code, secret }) {
      console.log("Entered and probably failed")
      console.log(code)
      console.log("+",secret,"+")
      const stepMs = 30_000;
const now = Date.now();

console.log({
  serverNow: new Date(now).toISOString(),
  serverWindow: Math.floor(now / stepMs),
  serverSecondsLeft: Math.ceil((stepMs - (now % stepMs)) / 1000),
});
      const result = await verify({
        secret,
        token: code,
      });
      console.log(result)
      return result.valid;
    },
  };
}

function mfaProblem(input: {
  status: number;
  slug: string;
  title: string;
  detail: string;
}): ProblemHttpError {
  return new ProblemHttpError({
    type: `https://taxpulse.example/problems/${input.slug}`,
    title: input.title,
    status: input.status,
    detail: input.detail,
  });
}

export function createMfaEnrollmentController({
  issuer = defaultMfaIssuer,
  repository,
  totpProvider = createDefaultMfaTotpProvider(issuer),
}: CreateMfaEnrollmentControllerOptions): MfaEnrollmentController {
  async function findTenantUser(input: {
    tenantId: string;
    userId: string;
  }): Promise<MfaTenantUser> {
    const user = await repository.findTenantUser(input);

    if (user === null) {
      throw mfaProblem({
        status: 404,
        slug: "mfa-user-not-found",
        title: "MFA User Not Found",
        detail: "No tenant-scoped user was found for MFA enrollment.",
      });
    }

    return user;
  }

  return {
    async enroll({ tenantId, userId }) {
      const user = await findTenantUser({ tenantId, userId });
      const existingEnrollment = await repository.findEnrollment({ userId });

      if (existingEnrollment?.isEnrolled === true) {
        throw mfaProblem({
          status: 409,
          slug: "mfa-already-enrolled",
          title: "MFA Already Enrolled",
          detail: "The user already has an active MFA enrollment.",
        });
      }

      const secret = totpProvider.generateSecret();
      await repository.savePendingEnrollment({
        userId,
        totpSecret: secret,
      });

      return mfaEnrollResultSchema.parse({
        provisioning_uri: totpProvider.generateProvisioningUri({
          accountLabel: user.email,
          secret,
        }),
      });
    },

    async confirm({ tenantId, userId, code }) {
      await findTenantUser({ tenantId, userId });

      const existingEnrollment = await repository.findEnrollment({ userId });

      if (existingEnrollment === null) {
        throw mfaProblem({
          status: 404,
          slug: "mfa-enrollment-not-found",
          title: "MFA Enrollment Not Found",
          detail: "No pending MFA enrollment was found for the user.",
        });
      }

      if (existingEnrollment.isEnrolled) {
        throw mfaProblem({
          status: 409,
          slug: "mfa-already-enrolled",
          title: "MFA Already Enrolled",
          detail: "The user already has an active MFA enrollment.",
        });
      }

      const isValid = await totpProvider.verifyCode({
        code,
        secret: existingEnrollment.totpSecret,
      });

      if (!isValid) {
        throw mfaProblem({
          status: 401,
          slug: "mfa-invalid-code",
          title: "Invalid MFA Code",
          detail: "The submitted MFA code is invalid.",
        });
      }

      await repository.markEnrolled({ userId });

      return { enrolled: true };
    },
  };
}
