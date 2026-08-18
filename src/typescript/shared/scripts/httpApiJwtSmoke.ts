import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { importPKCS8, SignJWT } from "jose";

import { getJwtConfigFromEnv } from "../../authConfig.js";
import { getJwtRs256IssuerConfigFromEnv } from "../../jwtRs256Config.js";

loadEnv({ quiet: true });

interface HttpApiJwtSmokeConfiguration {
  apiUrl: URL;
  caseId: string;
  tenantId: string;
  userId: string;
}

function requireEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for the HTTP API JWT smoke.`);
  }

  return value;
}

function getSmokeConfiguration(): HttpApiJwtSmokeConfiguration {
  const apiUrl = new URL(requireEnvironmentValue("TAXPULSE_HTTP_API_URL"));

  return {
    apiUrl,
    caseId: requireEnvironmentValue("TAXPULSE_HTTP_API_SMOKE_CASE_ID"),
    tenantId: requireEnvironmentValue("TAXPULSE_HTTP_API_SMOKE_TENANT_ID"),
    userId: requireEnvironmentValue("TAXPULSE_HTTP_API_SMOKE_USER_ID"),
  };
}

async function issueSmokeToken(input: {
  expiresAt: number;
  tenantId: string;
  userId: string;
}): Promise<string> {
  const config = getJwtConfigFromEnv();
  const issuerConfig = getJwtRs256IssuerConfigFromEnv();
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({
    role: "Firm Admin",
    tenant_id: input.tenantId,
  })
    .setProtectedHeader({
      alg: "RS256",
      kid: issuerConfig.signingKeyId,
      typ: "JWT",
    })
    .setSubject(input.userId)
    .setIssuer(config.issuer)
    .setAudience(config.audience ?? "taxpulse-http-api")
    .setIssuedAt(now)
    .setExpirationTime(input.expiresAt)
    .sign(await importPKCS8(issuerConfig.signingPrivateKeyPem, "RS256"));
}

function tamperToken(token: string): string {
  const finalCharacter = token.at(-1);

  if (!finalCharacter) {
    throw new Error("Cannot tamper an empty JWT.");
  }

  return `${token.slice(0, -1)}${finalCharacter === "a" ? "b" : "a"}`;
}

async function invokeProtectedRoute(input: {
  apiUrl: URL;
  caseId: string;
  token?: string;
}): Promise<Response> {
  const routeUrl = new URL(
    `v1/tax-plan-cycles/${encodeURIComponent(input.caseId)}/present-to-client`,
    `${input.apiUrl.toString().replace(/\/$/, "")}/`,
  );
  const headers = new Headers({ "content-type": "application/json" });

  if (input.token) {
    headers.set("authorization", `Bearer ${input.token}`);
  }

  return await fetch(routeUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      action_item: {
        description: "Synthetic HTTP API JWT smoke action item",
        deadline: "2030-01-01",
      },
    }),
  });
}

function assertStatus(input: { label: string; actual: number; expected: number }): void {
  if (input.actual !== input.expected) {
    throw new Error(`${input.label} expected HTTP ${input.expected}, received ${input.actual}.`);
  }
}

export async function runHttpApiJwtSmoke(): Promise<{ validTokenStatus: number }> {
  const smoke = getSmokeConfiguration();
  const now = Math.floor(Date.now() / 1000);
  const validToken = await issueSmokeToken({
    expiresAt: now + 300,
    tenantId: smoke.tenantId,
    userId: smoke.userId,
  });
  const expiredToken = await issueSmokeToken({
    expiresAt: now - 60,
    tenantId: smoke.tenantId,
    userId: smoke.userId,
  });
  const validResponse = await invokeProtectedRoute({
    apiUrl: smoke.apiUrl,
    caseId: smoke.caseId,
    token: validToken,
  });

  if (validResponse.status === 401) {
    throw new Error("The HTTP API gateway rejected the valid JWT.");
  }

  const [expiredResponse, tamperedResponse, missingResponse] = await Promise.all([
    invokeProtectedRoute({ apiUrl: smoke.apiUrl, caseId: smoke.caseId, token: expiredToken }),
    invokeProtectedRoute({ apiUrl: smoke.apiUrl, caseId: smoke.caseId, token: tamperToken(validToken) }),
    invokeProtectedRoute({ apiUrl: smoke.apiUrl, caseId: smoke.caseId }),
  ]);

  assertStatus({ label: "expired JWT", actual: expiredResponse.status, expected: 401 });
  assertStatus({ label: "tampered JWT", actual: tamperedResponse.status, expected: 401 });
  assertStatus({ label: "missing JWT", actual: missingResponse.status, expected: 401 });

  return { validTokenStatus: validResponse.status };
}

async function main(): Promise<void> {
  const result = await runHttpApiJwtSmoke();

  console.log("HTTP API JWT smoke passed.");
  console.log(`Valid JWT response status: ${result.validTokenStatus}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
