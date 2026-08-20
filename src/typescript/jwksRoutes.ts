import { createPublicKey } from "node:crypto";

import { Router } from "express";

import type { JwtRs256IssuerConfig } from "./jwtRs256Config.js";

export interface CreateJwksRouterOptions {
  issuerConfig: JwtRs256IssuerConfig;
}

/** Publishes the issuer's active signing public key without exposing private material. */
export function createJwksRouter({ issuerConfig }: CreateJwksRouterOptions): Router {
  const publicKey = createPublicKey(issuerConfig.signingPrivateKeyPem).export({ format: "jwk" });

  if (
    typeof publicKey.kty !== "string" ||
    typeof publicKey.n !== "string" ||
    typeof publicKey.e !== "string"
  ) {
    throw new Error("JWT_SIGNING_PRIVATE_KEY must contain an RSA public key.");
  }

  const router = Router();
  router.get("/.well-known/jwks.json", (_req, res) => {
    res.set("Cache-Control", "public, max-age=300");
    res.json({
      keys: [
        {
          alg: "RS256",
          e: publicKey.e,
          kid: issuerConfig.signingKeyId,
          kty: publicKey.kty,
          n: publicKey.n,
          use: "sig",
        },
      ],
    });
  });

  return router;
}
