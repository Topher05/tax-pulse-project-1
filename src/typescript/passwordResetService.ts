import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { HashPasswordOptions } from "./passwordHashing.js";
import { hashPassword } from "./passwordHashing.js";
import {
  InvalidResetTokenError,
  type PasswordResetRepository,
  type ResetTokenNotifier,
} from "./passwordReset.js";

export interface CreatePasswordResetServiceOptions {
  repository: PasswordResetRepository;
  notifier?: ResetTokenNotifier;
  hashPasswordOptions?: HashPasswordOptions;
  tokenTtlMs?: number;
  createTokenId?: () => string;
  generateRawToken?: () => string;
  now?: () => Date;
}

export interface PasswordResetService {
  requestReset(tenantId: string, email: string): Promise<void>;
  confirmReset(rawToken: string, newPassword: string): Promise<void>;
}

const defaultTokenTtlMs = 60 * 60 * 1_000; // 1 hour

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function createPasswordResetService({
  repository,
  notifier,
  hashPasswordOptions,
  tokenTtlMs = defaultTokenTtlMs,
  createTokenId = randomUUID,
  generateRawToken = () => randomBytes(32).toString("hex"),
  now = () => new Date(),
}: CreatePasswordResetServiceOptions): PasswordResetService {
  return {
    async requestReset(tenantId, email) {
      if (!notifier) {
        return;
      }

      const user = await repository.findActiveUserByEmail(tenantId, email);

      if (user === null) {
        // Silently succeed so callers cannot learn whether an email is registered.
        return;
      }

      const rawToken = generateRawToken();
      const tokenHash = sha256Hex(rawToken);

      await repository.createResetToken({
        id: createTokenId(),
        userId: user.userId,
        tokenHash,
        expiresAt: new Date(now().getTime() + tokenTtlMs),
      });

      await notifier.notify({ email: user.email, resetToken: rawToken });
    },

    async confirmReset(rawToken, newPassword) {
      const tokenHash = sha256Hex(rawToken);
      const newPasswordHash = await hashPassword(newPassword, hashPasswordOptions);
      const tokenRecord = await repository.resetPasswordWithToken(
        tokenHash,
        newPasswordHash,
        now(),
      );

      if (tokenRecord === null) {
        throw new InvalidResetTokenError();
      }
    },
  };
}
