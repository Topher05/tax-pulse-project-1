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
const userEmail = "alex@example.com";
const tokenId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d72";
const rawToken = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const newPassword = "new-secure-password";

class InMemoryPasswordResetRepository implements PasswordResetRepository {
  activeUser: ActiveUserRecord | null = {
    userId,
    email: userEmail,
  };

  tokenRecords: PasswordResetTokenRecord[] = [];
  updatedPasswordHashes: Map<string, string> = new Map();

  async findActiveUserByEmail(email: string): Promise<ActiveUserRecord | null> {
    if (this.activeUser && this.activeUser.email === email) {
      return this.activeUser;
    }
    return null;
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

  async findValidToken(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    const record = this.tokenRecords.find((r) => r.tokenHash === tokenHash);
    return record ?? null;
  }

  async markTokenUsed(id: string): Promise<void> {
    const record = this.tokenRecords.find((r) => r.id === id);
    if (record) {
      record.usedAt = new Date();
    }
  }

  async updatePasswordHash(uId: string, passwordHash: string): Promise<void> {
    this.updatedPasswordHashes.set(uId, passwordHash);
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

    await service.requestReset(userEmail);

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
    repository.activeUser = null;
    const notify = vi.fn<ResetTokenNotifier["notify"]>(async () => undefined);
    const service = createPasswordResetService({
      repository,
      notifier: { notify },
    });

    await expect(service.requestReset("unknown@example.com")).resolves.toBeUndefined();
    expect(repository.tokenRecords).toHaveLength(0);
    expect(notify).not.toHaveBeenCalled();
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

    await service.requestReset(userEmail);
    await expect(service.confirmReset(rawToken, newPassword)).resolves.toBeUndefined();

    expect(repository.tokenRecords[0]?.usedAt).not.toBeNull();
    const updatedHash = repository.updatedPasswordHashes.get(userId);
    expect(updatedHash).toBeDefined();
    expect(updatedHash).toMatch(/^\$argon2id\$/);
    await expect(verify(updatedHash!, newPassword)).resolves.toBe(true);
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

    await service.requestReset(userEmail);
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

    await service.requestReset(userEmail);

    // Fast forward 2 hours
    currentTime = new Date("2026-08-28T14:00:01Z");

    await expect(service.confirmReset(rawToken, newPassword)).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
  });
});
