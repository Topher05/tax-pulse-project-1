import { jwtVerify } from "jose";

const allowedRoles = new Set([
  "Firm Admin",
  "Advisor",
  "Client",
  "TaxPulse Platform Admin",
]);

function getBearerToken(authorizationToken) {
  if (!authorizationToken) {
    return null;
  }

  const match = /^Bearer ([^\s]+)$/.exec(authorizationToken);
  return match?.[1] ?? null;
}

function isValidPrincipal(payload) {
  return (
    typeof payload.sub === "string" &&
    payload.sub.length > 0 &&
    typeof payload.role === "string" &&
    allowedRoles.has(payload.role) &&
    typeof payload.tenant_id === "string" &&
    payload.tenant_id.length > 0
  );
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

export const handler = async (event) => {
  const issuer = process.env.JWT_ISSUER?.trim();
  const signingSecret = process.env.JWT_SIGNING_SECRET?.trim();

  if (!issuer || !signingSecret) {
    throw new Error("Unauthorized");
  }

  const token = getBearerToken(event.authorizationToken);

  if (!token) {
    throw new Error("Unauthorized");
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(signingSecret),
      {
        algorithms: ["HS256"],
        issuer,
        requiredClaims: ["exp"],
      },
    );

    if (!isValidPrincipal(payload)) {
      throw new Error("Unauthorized");
    }

    return buildPolicy(payload.sub, "Allow", event.methodArn, {
      userId: payload.sub,
      role: payload.role,
      tenantId: payload.tenant_id,
    });
  } catch {
    throw new Error("Unauthorized");
  }
};