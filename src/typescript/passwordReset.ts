import { z } from "zod";

import { ProblemHttpError } from "./errors.js";

/**
 * The forgot-password request intentionally accepts only an email address.
 * Tenant resolution is handled internally to prevent callers from probing
 * which tenants an email belongs to.
 */
export const forgotPasswordRequestSchema = z
  .object({
    email: z.string().email(),
  })
  .strict();

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

export const resetPasswordRequestSchema = z
  .object({
    token: z.string().min(1),
    new_password: z.string().min(8),
  })
  .strict();

export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

export const resetPasswordResultSchema = z.object({
  reset: z.literal(true),
});

export type ResetPasswordResult = z.infer<typeof resetPasswordResultSchema>;

export interface PasswordResetTokenInsert {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface ActiveUserRecord {
  userId: string;
  email: string;
}

export interface PasswordResetRepository {
  findActiveUserByEmail(tenantId: string, email: string): Promise<ActiveUserRecord | null>;
  createResetToken(input: PasswordResetTokenInsert): Promise<void>;
  resetPasswordWithToken(
    tokenHash: string,
    passwordHash: string,
    usedAt: Date,
  ): Promise<PasswordResetTokenRecord | null>;
}

export interface ResetTokenNotifier {
  notify(input: { email: string; resetToken: string }): Promise<void>;
}

export class InvalidResetTokenError extends Error {
  constructor() {
    super("The reset token is invalid or has expired.");
    this.name = "InvalidResetTokenError";
  }
}

export function invalidResetTokenProblem(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/invalid-reset-token",
    title: "Invalid Reset Token",
    status: 401,
    detail: "The reset token is invalid or has expired.",
  });
}
