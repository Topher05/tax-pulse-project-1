import { describe, expect, test, vi } from "vitest";

import {
  ProblemHttpError,
  createAuthMfaLoginController,
  type MfaEnrollmentRecord,
  type MfaEnrollmentRepository,
  type MfaTenantUser,
  type MfaTotpProvider,
  type TokenService,
} from "../../../../src/typescript/index.js";

const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";
const userId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61";
const validCode = "123456";

class InMemoryMfaEnrollmentRepository implements MfaEnrollmentRepository {
  tenantUser: MfaTenantUser | null = {
    id: userId,
    email: "alex@example.com",
    tenantId,
    role: "Firm Admin",
  };

  enrollment: MfaEnrollmentRecord | null = {
    userId,
    totpSecret: "FAKEBASE32SECRETFAKEBASE32SECRET",
    isEnrolled: true,
  };

  async findTenantUser(): Promise<MfaTenantUser | null> {
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

function createTokenService(issue = vi.fn<TokenService["issue"]>()): TokenService {
  return {
    issue,
    revokeRefreshToken: async () => false,
    rotateRefreshToken: async () => null,
  };
}

describe("auth MFA login controller", () => {
  test("issues a token pair from the trusted repository principal after valid TOTP", async () => {
    const issue = vi.fn<TokenService["issue"]>(async () => ({
      accessToken: "signed.access.jwt",
      refreshToken: "synthetic-refresh-token",
      accessTokenExpiresInSeconds: 900,
      refreshTokenExpiresInSeconds: 2_592_000,
      accessTokenExpiresAt: new Date("2026-07-16T18:15:00Z"),
      refreshTokenExpiresAt: new Date("2026-08-15T18:00:00Z"),
    }));
    const repository = new InMemoryMfaEnrollmentRepository();
    const controller = createAuthMfaLoginController({
      tokenService: createTokenService(issue),
      repository,
      totpProvider: createFakeTotpProvider(true),
    });

    const result = await controller.verify({
      tenant_id: tenantId,
      user_id: userId,
      code: validCode,
    });

    expect(issue).toHaveBeenCalledWith({
      userId,
      role: "Firm Admin",
      tenantId,
    });
    expect(result).toEqual({
      access_token: "signed.access.jwt",
      refresh_token: "synthetic-refresh-token",
      token_type: "Bearer",
      expires_in: 900,
      refresh_expires_in: 2_592_000,
    });
  });

  test.each([
    ["missing enrollment", (repository: InMemoryMfaEnrollmentRepository) => {
      repository.enrollment = null;
    }, true],
    ["unenrolled factor", (repository: InMemoryMfaEnrollmentRepository) => {
      repository.enrollment = {
        userId,
        totpSecret: "FAKEBASE32SECRETFAKEBASE32SECRET",
        isEnrolled: false,
      };
    }, true],
    ["invalid TOTP code", () => undefined, false],
  ])("rejects %s without issuing tokens", async (_description, arrange, validTotp) => {
    const issue = vi.fn<TokenService["issue"]>();
    const repository = new InMemoryMfaEnrollmentRepository();
    arrange(repository);
    const controller = createAuthMfaLoginController({
      tokenService: createTokenService(issue),
      repository,
      totpProvider: createFakeTotpProvider(validTotp),
    });

    await expect(
      controller.verify({ tenant_id: tenantId, user_id: userId, code: validCode }),
    ).rejects.toMatchObject({
      status: 401,
      title: "Authentication Failed",
    } satisfies Partial<ProblemHttpError>);
    expect(issue).not.toHaveBeenCalled();
  });
});
