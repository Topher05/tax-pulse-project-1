import {
  SendEmailCommand,
  SESv2Client,
  type SESv2ClientConfig,
} from "@aws-sdk/client-sesv2";

import type { ResetTokenNotifier } from "../domain/passwordReset.js";

export interface PasswordResetNotifierConfig {
  fromEmail: string;
  resetPageUrl: string;
}

export interface SesV2Client {
  send(command: SendEmailCommand): Promise<unknown>;
}

export function getPasswordResetNotifierConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): PasswordResetNotifierConfig | null {
  const fromEmail = env.TAXPULSE_PASSWORD_RESET_FROM_EMAIL?.trim();
  const resetPageUrl = env.TAXPULSE_PASSWORD_RESET_PAGE_URL?.trim();

  if (!fromEmail && !resetPageUrl) {
    return null;
  }

  if (!fromEmail || !resetPageUrl) {
    throw new Error(
      "TAXPULSE_PASSWORD_RESET_FROM_EMAIL and TAXPULSE_PASSWORD_RESET_PAGE_URL must be configured together.",
    );
  }

  const parsedResetPageUrl = new URL(resetPageUrl);

  if (env.NODE_ENV === "production" && parsedResetPageUrl.protocol !== "https:") {
    throw new Error("TAXPULSE_PASSWORD_RESET_PAGE_URL must use HTTPS in production.");
  }

  return { fromEmail, resetPageUrl: parsedResetPageUrl.toString() };
}

export function createPasswordResetSesClient(
  env: NodeJS.ProcessEnv = process.env,
): SESv2Client {
  const endpointUrl = env.TAXPULSE_SES_ENDPOINT_URL?.trim();
  const clientConfig: SESv2ClientConfig = {
    region: env.AWS_REGION?.trim() || "us-east-1",
  };

  if (endpointUrl) {
    clientConfig.endpoint = endpointUrl;
    clientConfig.credentials = {
      accessKeyId: env.AWS_ACCESS_KEY_ID?.trim() || "test",
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY?.trim() || "test",
    };
  }

  return new SESv2Client(clientConfig);
}

export function createSesPasswordResetNotifier(
  client: SesV2Client,
  config: PasswordResetNotifierConfig,
): ResetTokenNotifier {
  return {
    async notify({ email, resetToken }) {
      const resetUrl = new URL(config.resetPageUrl);
      resetUrl.searchParams.set("token", resetToken);

      await client.send(
        new SendEmailCommand({
          FromEmailAddress: config.fromEmail,
          Destination: { ToAddresses: [email] },
          Content: {
            Simple: {
              Subject: { Data: "Reset your TaxPulse password", Charset: "UTF-8" },
              Body: {
                Text: {
                  Data: [
                    "A password reset was requested for your TaxPulse account.",
                    `Use this link within one hour: ${resetUrl.toString()}`,
                    "If you did not request this reset, you can ignore this email.",
                  ].join("\n\n"),
                  Charset: "UTF-8",
                },
              },
            },
          },
        }),
      );
    },
  };
}
