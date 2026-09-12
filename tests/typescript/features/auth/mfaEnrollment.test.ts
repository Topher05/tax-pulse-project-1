import { describe, expect, test } from "vitest";

import {
  ProblemHttpError,
  createMfaEnrollmentController,
  type MfaEnrollmentRecord,
  type MfaEnrollmentRepository,
  type MfaTenantUser,
  type MfaTotpProvider,
} from "../../../../src/typescript/index.js";

const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";
const userId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61";

class InMemoryMfaEnrollmentRepository implements MfaEnrollmentRepository {
  tenantUser: MfaTenantUser | null = {
    id: userId,
    email: "alex@example.com",
    tenantId,
    role: "Firm Admin",
  };

  enrollment: MfaEnrollmentRecord | null = null;

  async findTenantUser(input: {
    tenantId: string;
    userId: string;
  }): Promise<MfaTenantUser | null> {
    if (
      input.tenantId !== tenantId ||
      input.userId !== userId ||
      this.tenantUser === null
    ) {
      return null;
    }

    return this.tenantUser;
  }

  async findEnrollment(): Promise<MfaEnrollmentRecord | null> {
    return this.enrollment;
  }

  async savePendingEnrollment(input: {
    userId: string;
    totpSecret: string;
  }): Promise<void> {
    this.enrollment = {
      userId: input.userId,
      totpSecret: input.totpSecret,
      isEnrolled: false,
    };
  }

  async markEnrolled(input: {
    userId: string;
  }): Promise<void> {
    if (this.enrollment?.userId !== input.userId) {
      return;
    }

    this.enrollment = {
      ...this.enrollment,
      isEnrolled: true,
    };
  }
}

function createFakeTotpProvider(validCode = "123456"): MfaTotpProvider {
  return {
    generateSecret: () => "FAKEBASE32SECRETFAKEBASE32SECRET",
    generateProvisioningUri: ({ accountLabel, secret }) =>
      `otpauth://totp/TaxPulse%20Advisory:${encodeURIComponent(
        accountLabel,
      )}?secret=${secret}&issuer=TaxPulse%20Advisory`,
    verifyCode: async ({ code }) => code === validCode,
  };
}

describe("MFA enrollment controller", () => {
  test("creates a pending enrollment and returns a provisioning URI", async () => {
    const repository = new InMemoryMfaEnrollmentRepository();
    const controller = createMfaEnrollmentController({
      repository,
      totpProvider: createFakeTotpProvider(),
    });

    await expect(controller.enroll({ tenantId, userId })).resolves.toEqual({
      provisioning_uri:
        "otpauth://totp/TaxPulse%20Advisory:alex%40example.com?secret=FAKEBASE32SECRETFAKEBASE32SECRET&issuer=TaxPulse%20Advisory",
    });

    expect(repository.enrollment).toEqual({
      userId,
      totpSecret: "FAKEBASE32SECRETFAKEBASE32SECRET",
      isEnrolled: false,
    });
  });

  test("confirms a pending enrollment with a valid current code", async () => {
    const repository = new InMemoryMfaEnrollmentRepository();
    repository.enrollment = {
      userId,
      totpSecret: "FAKEBASE32SECRETFAKEBASE32SECRET",
      isEnrolled: false,
    };
    const controller = createMfaEnrollmentController({
      repository,
      totpProvider: createFakeTotpProvider(),
    });

    await expect(
      controller.confirm({ tenantId, userId, code: "123456" }),
    ).resolves.toEqual({ enrolled: true });
    expect(repository.enrollment.isEnrolled).toBe(true);
  });

  test("rejects an invalid code without activating the enrollment", async () => {
    const repository = new InMemoryMfaEnrollmentRepository();
    repository.enrollment = {
      userId,
      totpSecret: "FAKEBASE32SECRETFAKEBASE32SECRET",
      isEnrolled: false,
    };
    const controller = createMfaEnrollmentController({
      repository,
      totpProvider: createFakeTotpProvider(),
    });

    await expect(
      controller.confirm({ tenantId, userId, code: "654321" }),
    ).rejects.toMatchObject({
      status: 401,
      title: "Invalid MFA Code",
    } satisfies Partial<ProblemHttpError>);
    expect(repository.enrollment.isEnrolled).toBe(false);
  });

  test("rejects tenant/user mismatches before writing enrollment state", async () => {
    const repository = new InMemoryMfaEnrollmentRepository();
    const controller = createMfaEnrollmentController({
      repository,
      totpProvider: createFakeTotpProvider(),
    });

    await expect(
      controller.enroll({
        tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02",
        userId,
      }),
    ).rejects.toMatchObject({
      status: 404,
      title: "MFA User Not Found",
    } satisfies Partial<ProblemHttpError>);
    expect(repository.enrollment).toBeNull();
  });

  test("blocks re-enrollment when MFA is already active", async () => {
    const repository = new InMemoryMfaEnrollmentRepository();
    repository.enrollment = {
      userId,
      totpSecret: "FAKEBASE32SECRETFAKEBASE32SECRET",
      isEnrolled: true,
    };
    const controller = createMfaEnrollmentController({
      repository,
      totpProvider: createFakeTotpProvider(),
    });

    await expect(controller.enroll({ tenantId, userId })).rejects.toMatchObject({
      status: 409,
      title: "MFA Already Enrolled",
    } satisfies Partial<ProblemHttpError>);
  });
});
