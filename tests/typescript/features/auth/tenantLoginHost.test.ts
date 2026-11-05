import { describe, expect, test } from "vitest";

import { parseTenantLoginHostname } from "../../../../src/typescript/features/auth/domain/tenantLoginHost.js";

describe("tenant login hostname contract", () => {
  test("returns a normalized tenant slug from a canonical login hostname", () => {
    expect(parseTenantLoginHostname("Acme-Advisory.taxpulse.example.")).toBe("acme-advisory");
  });

  test("supports an explicitly configured local-development base domain", () => {
    expect(
      parseTenantLoginHostname("northstar.localhost", { baseDomain: "localhost" }),
    ).toBe("northstar");
  });

  test.each([
    "taxpulse.example",
    "acme.eu.taxpulse.example",
    "-acme.taxpulse.example",
    "acme-.taxpulse.example",
    "acme_advisory.taxpulse.example",
    "acme.taxpulse.example:3000",
    "https://acme.taxpulse.example",
    "acme.other.example",
  ])("rejects a non-canonical tenant login hostname: %s", (hostname) => {
    expect(parseTenantLoginHostname(hostname)).toBeNull();
  });
});
