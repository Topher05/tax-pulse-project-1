import { SendEmailCommand } from "@aws-sdk/client-sesv2";
import { describe, expect, test, vi } from "vitest";

import {
  createSesPasswordResetNotifier,
  getPasswordResetNotifierConfigFromEnv,
  type SesV2Client,
} from "../../src/typescript/index.js";

describe("password reset notifier", () => {
  test("delivers a tenant-safe reset link through SES", async () => {
    const send = vi.fn<SesV2Client["send"]>(async () => ({}));
    const notifier = createSesPasswordResetNotifier(
      { send },
      {
        fromEmail: "no-reply@taxpulse.example",
        resetPageUrl: "https://login.taxpulse.example/password-reset/new",
      },
    );

    await notifier.notify({
      email: "user@example.test",
      resetToken: "synthetic-reset-token",
    });

    expect(send).toHaveBeenCalledOnce();
    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(SendEmailCommand);
    expect(command?.input.Destination?.ToAddresses).toEqual(["user@example.test"]);
    expect(command?.input.FromEmailAddress).toBe("no-reply@taxpulse.example");
    expect(command?.input.Content?.Simple?.Body?.Text?.Data).toContain(
      "https://login.taxpulse.example/password-reset/new?token=synthetic-reset-token",
    );
  });

  test("disables delivery when configuration is absent", () => {
    expect(getPasswordResetNotifierConfigFromEnv({ NODE_ENV: "production" })).toBeNull();
  });

  test("loads complete delivery configuration", () => {
    expect(
      getPasswordResetNotifierConfigFromEnv({
        NODE_ENV: "production",
        TAXPULSE_PASSWORD_RESET_FROM_EMAIL: "no-reply@taxpulse.example",
        TAXPULSE_PASSWORD_RESET_PAGE_URL:
          "https://login.taxpulse.example/password-reset/new",
      }),
    ).toEqual({
      fromEmail: "no-reply@taxpulse.example",
      resetPageUrl: "https://login.taxpulse.example/password-reset/new",
    });
  });

  test("rejects partial delivery configuration", () => {
    expect(() =>
      getPasswordResetNotifierConfigFromEnv({
        NODE_ENV: "production",
        TAXPULSE_PASSWORD_RESET_FROM_EMAIL: "no-reply@taxpulse.example",
      }),
    ).toThrow(
      "TAXPULSE_PASSWORD_RESET_FROM_EMAIL and TAXPULSE_PASSWORD_RESET_PAGE_URL must be configured together.",
    );
  });

  test("rejects non-HTTPS production reset links", () => {
    expect(() =>
      getPasswordResetNotifierConfigFromEnv({
        NODE_ENV: "production",
        TAXPULSE_PASSWORD_RESET_FROM_EMAIL: "no-reply@taxpulse.example",
        TAXPULSE_PASSWORD_RESET_PAGE_URL: "http://login.taxpulse.example/password-reset/new",
      }),
    ).toThrow("TAXPULSE_PASSWORD_RESET_PAGE_URL must use HTTPS in production.");
  });
});
