import { describe, expect, test } from "vitest";

import { createIssuerMetadataHandler } from "../../../../src/typescript/shared/scripts/issuer-metadata-lambda/index.js";

const handler = createIssuerMetadataHandler({
  serializedPublicJwk: JSON.stringify({
    e: "AQAB",
    kid: "synthetic-rsa-key",
    kty: "RSA",
    n: "synthetic-public-modulus",
  }),
});

describe("issuer metadata Lambda", () => {
  test("publishes discovery metadata and the matching public JWK", async () => {
    const discovery = await handler({
      rawPath: "/.well-known/openid-configuration",
      requestContext: { domainName: "synthetic.lambda-url.us-east-1.on.aws" },
    });
    const jwks = await handler({
      rawPath: "/.well-known/jwks.json",
      requestContext: { domainName: "synthetic.lambda-url.us-east-1.on.aws" },
    });

    expect(discovery.statusCode).toBe(200);
    expect(JSON.parse(discovery.body)).toEqual({
      issuer: "https://synthetic.lambda-url.us-east-1.on.aws",
      jwks_uri: "https://synthetic.lambda-url.us-east-1.on.aws/.well-known/jwks.json",
    });
    expect(jwks.statusCode).toBe(200);
    expect(JSON.parse(jwks.body)).toEqual({
      keys: [
        {
          alg: "RS256",
          e: "AQAB",
          kid: "synthetic-rsa-key",
          kty: "RSA",
          n: "synthetic-public-modulus",
          use: "sig",
        },
      ],
    });
  });

  test("rejects missing or malformed public-JWK configuration", () => {
    expect(() => createIssuerMetadataHandler({ serializedPublicJwk: undefined })).toThrow(
      "JWT_PUBLIC_JWK is required.",
    );
    expect(() => createIssuerMetadataHandler({ serializedPublicJwk: "not-json" })).toThrow(
      "JWT_PUBLIC_JWK must be valid JSON.",
    );
  });
});
