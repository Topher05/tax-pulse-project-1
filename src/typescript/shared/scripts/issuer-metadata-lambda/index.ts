interface IssuerMetadataEvent {
  headers?: Record<string, string | undefined>;
  rawPath?: string;
  requestContext?: {
    domainName?: string;
  };
}

interface IssuerMetadataResponse {
  body: string;
  headers: Record<string, string>;
  statusCode: number;
}

interface PublicRsaJwk {
  e: string;
  kid: string;
  kty: "RSA";
  n: string;
}

function isPublicRsaJwk(value: unknown): value is PublicRsaJwk {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.kty === "RSA" &&
    typeof candidate.kid === "string" &&
    candidate.kid.length > 0 &&
    typeof candidate.n === "string" &&
    candidate.n.length > 0 &&
    typeof candidate.e === "string" &&
    candidate.e.length > 0
  );
}

function parsePublicJwk(serializedPublicJwk: string | undefined): PublicRsaJwk {
  if (!serializedPublicJwk) {
    throw new Error("JWT_PUBLIC_JWK is required.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serializedPublicJwk) as unknown;
  } catch {
    throw new Error("JWT_PUBLIC_JWK must be valid JSON.");
  }

  if (!isPublicRsaJwk(parsed)) {
    throw new Error("JWT_PUBLIC_JWK must be an RSA public JWK with kid, n, and e.");
  }

  return parsed;
}

function jsonResponse(statusCode: number, body: unknown): IssuerMetadataResponse {
  return {
    statusCode,
    headers: {
      "cache-control": "public, max-age=300",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function issuerFor(event: IssuerMetadataEvent): string | null {
  const domainName = event.requestContext?.domainName ?? event.headers?.host;

  return domainName ? `https://${domainName}` : null;
}

export function createIssuerMetadataHandler(input: {
  serializedPublicJwk: string | undefined;
}): (event: IssuerMetadataEvent) => Promise<IssuerMetadataResponse> {
  const publicJwk = parsePublicJwk(input.serializedPublicJwk);

  return async (event) => {
    const issuer = issuerFor(event);

    if (!issuer) {
      return jsonResponse(500, { message: "Issuer hostname is unavailable." });
    }

    if (event.rawPath === "/.well-known/openid-configuration") {
      return jsonResponse(200, {
        issuer,
        jwks_uri: `${issuer}/.well-known/jwks.json`,
      });
    }

    if (event.rawPath === "/.well-known/jwks.json") {
      return jsonResponse(200, {
        keys: [
          {
            alg: "RS256",
            e: publicJwk.e,
            kid: publicJwk.kid,
            kty: publicJwk.kty,
            n: publicJwk.n,
            use: "sig",
          },
        ],
      });
    }

    return jsonResponse(404, { message: "Not found." });
  };
}

let handler: ((event: IssuerMetadataEvent) => Promise<IssuerMetadataResponse>) | undefined;

export async function handlerForIssuerMetadata(
  event: IssuerMetadataEvent,
): Promise<IssuerMetadataResponse> {
  handler ??= createIssuerMetadataHandler({
    serializedPublicJwk: process.env.JWT_PUBLIC_JWK,
  });

  return await handler(event);
}

export { handlerForIssuerMetadata as handler };
