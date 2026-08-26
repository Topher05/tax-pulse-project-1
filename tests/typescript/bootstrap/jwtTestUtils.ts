import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { exportJWK, exportPKCS8, generateKeyPair, SignJWT } from "jose";

type TestUserRole = "Firm Admin" | "Advisor" | "Client" | "TaxPulse Platform Admin";

export interface TestJwtFixture {
  readonly issuer: string;
  readonly jwks: { readonly keys: readonly Record<string, unknown>[] };
  readonly privateKey: CryptoKey;
  readonly privateKeyPem: string;
  readonly signingKeyId: string;
}

export async function createTestJwtFixture(
  issuer = "https://auth.taxpulse.example",
): Promise<TestJwtFixture> {
  const signingKeyId = "test-rs256-key";
  const { publicKey, privateKey } = await generateKeyPair("RS256", {
    extractable: true,
  });
  const publicJwk = await exportJWK(publicKey);

  return {
    issuer,
    jwks: {
      keys: [
        {
          ...publicJwk,
          alg: "RS256",
          kid: signingKeyId,
          use: "sig",
        },
      ],
    },
    privateKey,
    privateKeyPem: await exportPKCS8(privateKey),
    signingKeyId,
  };
}

export async function signTestAccessToken(
  fixture: TestJwtFixture,
  {
    tenantId = "tenant-from-jwt",
    userId = "user-from-jwt",
    role = "Advisor",
  }: {
    readonly tenantId?: string;
    readonly userId?: string;
    readonly role?: TestUserRole;
  } = {},
): Promise<string> {
  return await new SignJWT({
    role,
    tenant_id: tenantId,
  })
    .setProtectedHeader({
      alg: "RS256",
      kid: fixture.signingKeyId,
      typ: "JWT",
    })
    .setSubject(userId)
    .setIssuer(fixture.issuer)
    .setExpirationTime("15m")
    .sign(fixture.privateKey);
}

export async function withJwksServer<T>(
  jwks: TestJwtFixture["jwks"],
  run: (jwksUrl: string) => Promise<T>,
): Promise<T> {
  const server = createServer((request, response) => {
    if (request.url !== "/.well-known/jwks.json") {
      response.writeHead(404).end();
      return;
    }

    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(jwks));
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    return await run(`http://127.0.0.1:${address.port}/.well-known/jwks.json`);
  } finally {
    server.close();
    await once(server, "close");
  }
}
