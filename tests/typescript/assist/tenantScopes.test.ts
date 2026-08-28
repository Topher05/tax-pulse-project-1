import { describe, expect, test } from "vitest";

import {
  AssistTenantScopeConfigurationError,
  AssistTenantScopeUnavailableError,
  allAssistTenantCorpusScopes,
  parseAssistTenantCorpusScopeMap,
  resolveAssistTenantCorpusScopes,
} from "../../../src/typescript/assist/tenantScopes.js";

describe("assist tenant corpus scopes", () => {
  test("parses tenant-to-scope mappings and preserves shared scope support", () => {
    const tenantScopeMap = parseAssistTenantCorpusScopeMap(
      JSON.stringify({
        "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01": "tenant-alpha",
        "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02": "tenant-beta",
      }),
    );

    expect(resolveAssistTenantCorpusScopes(tenantScopeMap, "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01")).toEqual([
      "tenant-alpha",
      "tenant-shared",
    ]);
    expect(allAssistTenantCorpusScopes()).toEqual(["tenant-alpha", "tenant-beta", "tenant-shared"]);
  });

  test("fails closed for missing or invalid mappings", () => {
    expect(() => parseAssistTenantCorpusScopeMap("[]")).toThrow(AssistTenantScopeConfigurationError);

    const tenantScopeMap = parseAssistTenantCorpusScopeMap(
      JSON.stringify({
        "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01": "tenant-alpha",
      }),
    );

    expect(() =>
      resolveAssistTenantCorpusScopes(tenantScopeMap, "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d03"),
    ).toThrow(AssistTenantScopeUnavailableError);
  });
});
