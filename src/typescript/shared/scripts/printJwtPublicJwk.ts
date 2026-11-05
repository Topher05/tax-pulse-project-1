import { createPublicKey } from "node:crypto";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";

import { getJwtRs256IssuerConfigFromEnv } from "../../features/auth/infrastructure/jwtRs256Config.js";

loadEnv({ quiet: true });

export function getJwtPublicJwk(): Record<string, string> {
  const issuerConfig = getJwtRs256IssuerConfigFromEnv();
  const publicKey = createPublicKey(issuerConfig.signingPrivateKeyPem).export({ format: "jwk" });

  if (
    publicKey.kty !== "RSA" ||
    typeof publicKey.n !== "string" ||
    typeof publicKey.e !== "string"
  ) {
    throw new Error("JWT_SIGNING_PRIVATE_KEY must contain an RSA public key.");
  }

  return {
    e: publicKey.e,
    kid: issuerConfig.signingKeyId,
    kty: publicKey.kty,
    n: publicKey.n,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(getJwtPublicJwk()));
}
