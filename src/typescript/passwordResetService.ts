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
  notifier: ResetTokenNotifier;
  hashPasswordOptions?: HashPasswordOptions;
  tokenTtlMs?: number;
  createTokenId?: () => string;
  generateRawToken?: () => string;
  now?: () => Date;
}

export interface PasswordResetService {
  requestReset(email: string): Promise<void>;
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
    async requestReset(email) {
      const user = await repository.findActiveUserByEmail(email);

      if (user === null) {
        // Silently succeed — never reveal whether an email is registered.
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
      const tokenRecord = await repository.findValidToken(tokenHash);

      if (tokenRecord === null) {
        throw new InvalidResetTokenError();
      }

      if (tokenRecord.usedAt !== null) {
        throw new InvalidResetTokenError();
      }

      if (tokenRecord.expiresAt.getTime() <= now().getTime()) {
        throw new InvalidResetTokenError();
      }

      const newPasswordHash = await hashPassword(newPassword, hashPasswordOptions);
      await repository.updatePasswordHash(tokenRecord.userId, newPasswordHash);
      await repository.markTokenUsed(tokenRecord.id);
    },
  };
}
