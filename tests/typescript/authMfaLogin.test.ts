import { describe, expect, test, vi } from "vitest";

import {
  ProblemHttpError,
  createAuthMfaLoginController,
  createHmacJwtIssuer,
  type AccessTokenIssuer,
  type MfaEnrollmentRecord,
  type MfaEnrollmentRepository,
  type MfaTenantUser,
  type MfaTotpProvider,
} from "../../src/typescript/index.js";

const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";
const userId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61";
const validCode = "123456";

class InMemoryMfaEnrollmentRepository implements MfaEnrollmentRepository {
  tenantUser: MfaTenantUser | null = {
    id: userId,
    email: "alex@example.com",
  };

  enrollment: MfaEnrollmentRecord | null = {
    userId,
    totpSecret: "FAKEBASE32SECRETFAKEBASE32SECRET",
    isEnrolled: true,
  };

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

  async savePendingEnrollment(): Promise<void> {
    throw new Error("savePendingEnrollment is not used by login MFA.");
  }

  async markEnrolled(): Promise<void> {
    throw new Error("markEnrolled is not used by login MFA.");
  }
}

function createFakeTotpProvider(isValid: boolean): MfaTotpProvider {
  return {
    generateSecret: () => "FAKEBASE32SECRETFAKEBASE32SECRET",
    generateProvisioningUri: () => "otpauth://totp/TaxPulse%20Advisory:test",
    verifyCode: async ({ code }) => isValid && code === validCode,
  };
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split(".")[1];

  if (payload === undefined) {
    throw new Error("Expected JWT payload.");
  }

  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<
    string,
    unknown
  >;
}

describe("auth MFA login controller", () => {
  test("returns a signed bearer JWT for an enrolled user with a valid TOTP code", async () => {
    const controller = createAuthMfaLoginController({
      jwtIssuer: createHmacJwtIssuer({
        issuer: "TaxPulse Test Issuer",
        now: () => new Date("2026-07-16T18:00:00Z"),
        secret: "synthetic-test-secret",
        ttlSeconds: 600,
      }),
      repository: new InMemoryMfaEnrollmentRepository(),
      totpProvider: createFakeTotpProvider(true),
    });

    const result = await controller.verify({
      tenant_id: tenantId,
      user_id: userId,
      code: validCode,
    });

    expect(result.token_type).toBe("Bearer");
    expect(result.expires_in).toBe(600);
    expect(result.access_token.split(".")).toHaveLength(3);
    expect(decodeJwtPayload(result.access_token)).toMatchObject({
      sub: userId,
      tenant_id: tenantId,
      iss: "TaxPulse Test Issuer",
      iat: 1_784_224_800,
      exp: 1_784_225_400,
    });
  });

  test("rejects a missing enrollment without issuing a token", async () => {
    const repository = new InMemoryMfaEnrollmentRepository();
    repository.enrollment = null;
    const issueAccessToken = vi.fn<AccessTokenIssuer["issueAccessToken"]>();
    const controller = createAuthMfaLoginController({
      jwtIssuer: { issueAccessToken },
      repository,
      totpProvider: createFakeTotpProvider(true),
    });

    await expect(
      controller.verify({
        tenant_id: tenantId,
        user_id: userId,
        code: validCode,
      }),
    ).rejects.toMatchObject({
      status: 401,
      title: "Authentication Failed",
    } satisfies Partial<ProblemHttpError>);
    expect(issueAccessToken).not.toHaveBeenCalled();
  });

  test("rejects an unenrolled factor without issuing a token", async () => {
    const repository = new InMemoryMfaEnrollmentRepository();
    repository.enrollment = {
      userId,
      totpSecret: "FAKEBASE32SECRETFAKEBASE32SECRET",
      isEnrolled: false,
    };
    const issueAccessToken = vi.fn<AccessTokenIssuer["issueAccessToken"]>();
    const controller = createAuthMfaLoginController({
      jwtIssuer: { issueAccessToken },
      repository,
      totpProvider: createFakeTotpProvider(true),
    });

    await expect(
      controller.verify({
        tenant_id: tenantId,
        user_id: userId,
        code: validCode,
      }),
    ).rejects.toMatchObject({
      status: 401,
      title: "Authentication Failed",
    } satisfies Partial<ProblemHttpError>);
    expect(issueAccessToken).not.toHaveBeenCalled();
  });

  test("rejects invalid or expired TOTP codes without issuing a token", async () => {
    const issueAccessToken = vi.fn<AccessTokenIssuer["issueAccessToken"]>();
    const controller = createAuthMfaLoginController({
      jwtIssuer: { issueAccessToken },
      repository: new InMemoryMfaEnrollmentRepository(),
      totpProvider: createFakeTotpProvider(false),
    });

    await expect(
      controller.verify({
        tenant_id: tenantId,
        user_id: userId,
        code: validCode,
      }),
    ).rejects.toMatchObject({
      status: 401,
      title: "Authentication Failed",
    } satisfies Partial<ProblemHttpError>);
    expect(issueAccessToken).not.toHaveBeenCalled();
  });
});
