import { z } from "zod";

export interface JwtConfig {
  issuer: string;
  audience?: string;
  jwksUrl?: string;
  /** @deprecated Test fixture compatibility only; production configuration never reads this. */
  signingSecret?: string;
  accessTokenLifetimeSeconds: number;
  refreshTokenLifetimeSeconds: number;
}

/**
 * Returns the deployment-owned base domain for tenant login hostnames.
 *
 * An omitted value intentionally preserves the default used by
 * `parseTenantLoginHostname` for existing deployments.
 */
export function getTenantLoginBaseDomainFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const baseDomain = env.TAXPULSE_LOGIN_BASE_DOMAIN?.trim();

  return baseDomain || undefined;
}

const jwtEnvironmentSchema = z
  .object({
    JWT_ISSUER: z
      .string()
      .trim()
      .min(1, "JWT_ISSUER is required.")
      .url("JWT_ISSUER must be a valid URL."),
    JWT_AUDIENCE: z
      .string()
      .trim()
      .min(1, "JWT_AUDIENCE must not be empty.")
      .default("taxpulse-http-api"),
    JWT_JWKS_URL: z.string().trim().url("JWT_JWKS_URL must be a valid URL.").optional(),
    JWT_ACCESS_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int("JWT_ACCESS_TOKEN_TTL_SECONDS must be a whole number.")
      .min(1, "JWT_ACCESS_TOKEN_TTL_SECONDS must be positive.")
      .max(3600, "JWT_ACCESS_TOKEN_TTL_SECONDS must be at most 3600.")
      .default(900),

    JWT_REFRESH_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int("JWT_REFRESH_TOKEN_TTL_SECONDS must be a whole number.")
      .min(1, "JWT_REFRESH_TOKEN_TTL_SECONDS must be positive.")
      .default(2_592_000),
  })
  .superRefine((config, context) => {
    if (
      config.JWT_REFRESH_TOKEN_TTL_SECONDS <=
      config.JWT_ACCESS_TOKEN_TTL_SECONDS
    ) {
      context.addIssue({
        code: "custom",
        path: ["JWT_REFRESH_TOKEN_TTL_SECONDS"],
        message:
          "JWT_REFRESH_TOKEN_TTL_SECONDS must be greater than JWT_ACCESS_TOKEN_TTL_SECONDS.",
      });
    }
  });

export function getJwtConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): JwtConfig {
  const parsed = jwtEnvironmentSchema.parse({
    JWT_ISSUER: env.JWT_ISSUER,
    JWT_AUDIENCE: env.JWT_AUDIENCE,
    JWT_JWKS_URL: env.JWT_JWKS_URL,
    JWT_ACCESS_TOKEN_TTL_SECONDS: env.JWT_ACCESS_TOKEN_TTL_SECONDS,
    JWT_REFRESH_TOKEN_TTL_SECONDS: env.JWT_REFRESH_TOKEN_TTL_SECONDS,
  });

  return {
    issuer: parsed.JWT_ISSUER,
    audience: parsed.JWT_AUDIENCE,
    jwksUrl: parsed.JWT_JWKS_URL ?? new URL("/.well-known/jwks.json", parsed.JWT_ISSUER).toString(),
    accessTokenLifetimeSeconds: parsed.JWT_ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenLifetimeSeconds: parsed.JWT_REFRESH_TOKEN_TTL_SECONDS,
  };
}
