import { describe, expect, test } from "vitest";

import {
  getSmokeTokenIssuedAt,
  getValidJwtRejectionDiagnostic,
  smokeTokenIssuedAtLeewaySeconds,
} from "../../../../src/typescript/shared/scripts/httpApiJwtSmoke.js";

function base64UrlJson(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

describe("getValidJwtRejectionDiagnostic", () => {
  test("backdates smoke-token issuance to tolerate gateway clock skew", () => {
    expect(getSmokeTokenIssuedAt(1_800_000_000)).toBe(
      1_800_000_000 - smokeTokenIssuedAtLeewaySeconds,
    );
  });

  test("reports only safe JWT metadata and request identifiers", () => {
    const token = [
      base64UrlJson({ alg: "RS256", kid: "demo-key" }),
      base64UrlJson({
        aud: "taxpulse-http-api",
        exp: 1_800_000_000,
        iat: 1_799_999_700,
        iss: "https://issuer.example",
        role: "Firm Admin",
        sub: "user-that-must-not-be-logged",
        tenant_id: "tenant-that-must-not-be-logged",
      }),
      "signature-that-must-not-be-logged",
    ].join(".");
    const response = new Response("Unauthorized", {
      headers: {
        "x-amzn-requestid": "gateway-request-id",
        "x-unrelated-header": "must-not-be-logged",
      },
      status: 401,
    });

    expect(getValidJwtRejectionDiagnostic({ token, response })).toEqual({
      responseStatus: 401,
      responseHeaders: {
        "x-amzn-requestid": "gateway-request-id",
      },
      token: {
        algorithm: "RS256",
        audience: "taxpulse-http-api",
        expiresAt: 1_800_000_000,
        issuedAt: 1_799_999_700,
        issuer: "https://issuer.example",
        keyId: "demo-key",
      },
    });
  });
});
