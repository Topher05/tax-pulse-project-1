import { verify } from "argon2";
import { describe, expect, test, vi } from "vitest";

import {
  InvalidResetTokenError,
  createPasswordResetService,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
  type ActiveUserRecord,
  type PasswordResetRepository,
  type PasswordResetTokenInsert,
  type PasswordResetTokenRecord,
  type ResetTokenNotifier,
} from "../../src/typescript/index.js";
import { fastPasswordHashConfig } from "./auth/auth.test.model.js";

const userId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61";
const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d51";
const userEmail = "alex@example.com";
const tokenId = "test-reset-token-id";
const rawToken = "fake-reset-token-for-tests";
const newPassword = "new-secure-password";

class InMemoryPasswordResetRepository implements PasswordResetRepository {
  activeUsers: Array<ActiveUserRecord & { tenantId: string }> = [
    {
      tenantId,
      userId,
      email: userEmail,
    },
  ];

  tokenRecords: PasswordResetTokenRecord[] = [];
  updatedPasswordHashes: Map<string, string> = new Map();
  revokedSessionUserIds: string[] = [];

  async findActiveUserByEmail(
    requestedTenantId: string,
    email: string,
  ): Promise<ActiveUserRecord | null> {
    const user = this.activeUsers.find(
      (record) => record.tenantId === requestedTenantId && record.email === email,
    );
    return user ? { userId: user.userId, email: user.email } : null;
  }

  async createResetToken(input: PasswordResetTokenInsert): Promise<void> {
    this.tokenRecords.push({
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      usedAt: null,
    });
  }

  async resetPasswordWithToken(
    tokenHash: string,
    passwordHash: string,
    usedAt: Date,
  ): Promise<PasswordResetTokenRecord | null> {
    const record = this.tokenRecords.find((r) => r.tokenHash === tokenHash);
    if (!record || record.usedAt !== null || record.expiresAt.getTime() <= usedAt.getTime()) {
      return null;
    }
    record.usedAt = usedAt;
    this.updatedPasswordHashes.set(record.userId, passwordHash);
    this.revokedSessionUserIds.push(record.userId);
    return record;
  }
}

describe("password reset contracts", () => {
  test("validates forgot-password schema", () => {
    expect(forgotPasswordRequestSchema.parse({ email: "user@example.com" })).toEqual({
      email: "user@example.com",
    });

    expect(
      forgotPasswordRequestSchema.safeParse({ email: "invalid-email" }).success,
    ).toBe(false);

    expect(
      forgotPasswordRequestSchema.safeParse({
        email: "user@example.com",
        extra: "unrecognized",
      }).success,
    ).toBe(false);
  });

  test("validates reset-password schema", () => {
    expect(
      resetPasswordRequestSchema.parse({
        token: "some-token",
        new_password: "new-password-123",
      }),
    ).toEqual({
      token: "some-token",
      new_password: "new-password-123",
    });

    expect(
      resetPasswordRequestSchema.safeParse({
        token: "",
        new_password: "short",
      }).success,
    ).toBe(false);
  });
});

describe("password reset service", () => {
  test("creates a hashed token and notifies the recipient when user exists", async () => {
    const repository = new InMemoryPasswordResetRepository();
    const notify = vi.fn<ResetTokenNotifier["notify"]>(async () => undefined);
    const service = createPasswordResetService({
      repository,
      notifier: { notify },
      createTokenId: () => tokenId,
      generateRawToken: () => rawToken,
    });

    await service.requestReset(tenantId, userEmail);

    expect(repository.tokenRecords).toHaveLength(1);
    expect(repository.tokenRecords[0]?.userId).toBe(userId);
    expect(repository.tokenRecords[0]?.tokenHash).not.toBe(rawToken);
    expect(repository.tokenRecords[0]?.tokenHash).toHaveLength(64);
    expect(notify).toHaveBeenCalledWith({
      email: userEmail,
      resetToken: rawToken,
    });
  });

  test("silently completes without creating token or notifying when user is not found", async () => {
    const repository = new InMemoryPasswordResetRepository();
    repository.activeUsers = [];
    const notify = vi.fn<ResetTokenNotifier["notify"]>(async () => undefined);
    const service = createPasswordResetService({
      repository,
      notifier: { notify },
    });

    await expect(service.requestReset(tenantId, "unknown@example.com")).resolves.toBeUndefined();
    expect(repository.tokenRecords).toHaveLength(0);
    expect(notify).not.toHaveBeenCalled();
  });

  test("looks up reset recipients within the resolved tenant", async () => {
    const otherTenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d52";
    const otherUserId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62";
    const repository = new InMemoryPasswordResetRepository();
    repository.activeUsers = [
      { tenantId, userId, email: userEmail },
      { tenantId: otherTenantId, userId: otherUserId, email: userEmail },
    ];
    const notify = vi.fn<ResetTokenNotifier["notify"]>(async () => undefined);
    const service = createPasswordResetService({
      repository,
      notifier: { notify },
      createTokenId: () => tokenId,
      generateRawToken: () => rawToken,
    });

    await service.requestReset(otherTenantId, userEmail);

    expect(repository.tokenRecords).toHaveLength(1);
    expect(repository.tokenRecords[0]?.userId).toBe(otherUserId);
  });

  test("confirms password reset with a valid token and hashes the new password with Argon2id", async () => {
    const repository = new InMemoryPasswordResetRepository();
    const notify = vi.fn<ResetTokenNotifier["notify"]>(async () => undefined);
    const service = createPasswordResetService({
      repository,
      notifier: { notify },
      hashPasswordOptions: { config: fastPasswordHashConfig },
      createTokenId: () => tokenId,
      generateRawToken: () => rawToken,
    });

    await service.requestReset(tenantId, userEmail);
    await expect(service.confirmReset(rawToken, newPassword)).resolves.toBeUndefined();

    expect(repository.tokenRecords[0]?.usedAt).not.toBeNull();
    const updatedHash = repository.updatedPasswordHashes.get(userId);
    expect(updatedHash).toBeDefined();
    expect(updatedHash).toMatch(/^\$argon2id\$/);
    await expect(verify(updatedHash!, newPassword)).resolves.toBe(true);
    expect(repository.revokedSessionUserIds).toEqual([userId]);
  });

  test("rejects an invalid reset token", async () => {
    const repository = new InMemoryPasswordResetRepository();
    const notify = vi.fn<ResetTokenNotifier["notify"]>(async () => undefined);
    const service = createPasswordResetService({
      repository,
      notifier: { notify },
    });

    await expect(service.confirmReset("invalid-raw-token", newPassword)).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
  });

  test("rejects an already-used reset token", async () => {
    const repository = new InMemoryPasswordResetRepository();
    const notify = vi.fn<ResetTokenNotifier["notify"]>(async () => undefined);
    const service = createPasswordResetService({
      repository,
      notifier: { notify },
      hashPasswordOptions: { config: fastPasswordHashConfig },
      createTokenId: () => tokenId,
      generateRawToken: () => rawToken,
    });

    await service.requestReset(tenantId, userEmail);
    await service.confirmReset(rawToken, newPassword);

    await expect(service.confirmReset(rawToken, "another-password")).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
  });

  test("rejects an expired reset token", async () => {
    const repository = new InMemoryPasswordResetRepository();
    const notify = vi.fn<ResetTokenNotifier["notify"]>(async () => undefined);
    let currentTime = new Date("2026-08-28T12:00:00Z");

    const service = createPasswordResetService({
      repository,
      notifier: { notify },
      createTokenId: () => tokenId,
      generateRawToken: () => rawToken,
      tokenTtlMs: 3600_000,
      now: () => currentTime,
    });

    await service.requestReset(tenantId, userEmail);

    // Fast forward 2 hours
    currentTime = new Date("2026-08-28T14:00:01Z");

    await expect(service.confirmReset(rawToken, newPassword)).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
  });
});
