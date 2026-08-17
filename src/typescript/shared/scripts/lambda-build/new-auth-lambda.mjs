import { createHmac, timingSafeEqual } from "node:crypto";

const allowedRoles = new Set([
  "Firm Admin",
  "Advisor",
  "Client",
  "TaxPulse Platform Admin",
]);

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function base64UrlEncode(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getBearerToken(authorizationToken) {
  if (!authorizationToken) {
    return null;
  }

  const match = /^Bearer ([^\s]+)$/.exec(authorizationToken);
  return match?.[1] ?? null;
}

function parseJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  const header = JSON.parse(base64UrlDecode(encodedHeader).toString("utf8"));
  const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8"));
  const signature = base64UrlDecode(encodedSignature);

  return {
    header,
    payload,
    signature,
    signingInput: `${encodedHeader}.${encodedPayload}`,
  };
}

function verifyHs256(token, secret) {
  const { header, payload, signature, signingInput } = parseJwt(token);

  if (!header || header.alg !== "HS256" || header.typ !== "JWT") {
    throw new Error("Unsupported JWT header");
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(signingInput)
    .digest();

  if (
    signature.length !== expectedSignature.length ||
    !timingSafeEqual(signature, expectedSignature)
  ) {
    throw new Error("Invalid JWT signature");
  }

  return payload;
}

function isValidPrincipal(payload) {
  return (
    typeof payload.sub === "string" &&
    payload.sub.length > 0 &&
    typeof payload.role === "string" &&
    allowedRoles.has(payload.role) &&
    typeof payload.tenant_id === "string" &&
    payload.tenant_id.length > 0 &&
    typeof payload.exp === "number" &&
    Number.isFinite(payload.exp)
  );
}

function isExpired(exp) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return exp <= nowSeconds;
}

function buildPolicy(principalId, effect, methodArn, context = {}) {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: methodArn,
        },
      ],
    },
    context,
  };
}

function unauthorized() {
  const error = new Error("Unauthorized");
  error.statusCode = 401;
  throw error;
}

export const handler = async (event) => {
  const issuer = process.env.JWT_ISSUER?.trim();
  const signingSecret = process.env.JWT_SIGNING_SECRET?.trim();

  if (!issuer || !signingSecret) {
    unauthorized();
  }

  const token = getBearerToken(event.authorizationToken);
  if (!token) {
    unauthorized();
  }

  try {
    const payload = verifyHs256(token, signingSecret);

    if (payload.iss !== issuer) {
      unauthorized();
    }

    if (isExpired(payload.exp)) {
      unauthorized();
    }

    if (!isValidPrincipal(payload)) {
      unauthorized();
    }

    return buildPolicy(payload.sub, "Allow", event.methodArn, {
      userId: String(payload.sub),
      role: String(payload.role),
      tenantId: String(payload.tenant_id),
    });
  } catch {
    unauthorized();
  }
};