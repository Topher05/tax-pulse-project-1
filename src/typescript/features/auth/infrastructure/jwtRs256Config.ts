import { z } from "zod";

const issuerSchema = z
  .string()
  .trim()
  .min(1, "JWT_ISSUER is required.")
  .pipe(z.url("JWT_ISSUER must be a valid URL."));

const keyIdSchema = z
  .string()
  .trim()
  .min(1, "JWT_SIGNING_KEY_ID is required.");

const privateKeySchema = z
  .string()
  .trim()
  .min(1, "JWT_SIGNING_PRIVATE_KEY is required.")
  .refine(
    (value) => value.includes("-----BEGIN PRIVATE KEY-----"),
    "JWT_SIGNING_PRIVATE_KEY must be a PEM-encoded PKCS#8 private key.",
  );

export interface JwtRs256IssuerConfig {
  issuer: string;
  signingPrivateKeyPem: string;
  signingKeyId: string;
}

export interface JwtJwksVerifierConfig {
  issuer: string;
  jwksUrl: string;
}

function normalizePem(value: string): string {
  return value.replaceAll("\\n", "\n");
}

/**
 * Loads the issuer-only configuration used to sign RS256 access tokens.
 *
 * This configuration must remain in the Node issuer process and must never be
 * supplied to token-verifying services.
 */
export function getJwtRs256IssuerConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): JwtRs256IssuerConfig {
  const issuer = issuerSchema.parse(env.JWT_ISSUER);
  const signingPrivateKeyPem = privateKeySchema.parse(
    normalizePem(env.JWT_SIGNING_PRIVATE_KEY ?? ""),
  );
  const signingKeyId = keyIdSchema.parse(env.JWT_SIGNING_KEY_ID);

  return { issuer, signingPrivateKeyPem, signingKeyId };
}

/**
 * Loads public-key-only verification configuration for JWKS consumers.
 */
export function getJwtJwksVerifierConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): JwtJwksVerifierConfig {
  const issuer = issuerSchema.parse(env.JWT_ISSUER);
  const jwksUrl = z
    .string()
    .trim()
    .pipe(z.url("JWT_JWKS_URL must be a valid URL."))
    .parse(env.JWT_JWKS_URL ?? new URL("/.well-known/jwks.json", issuer).toString());

  return { issuer, jwksUrl };
}
