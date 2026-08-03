import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CaseApiError, caseApiGetJson } from "../shared/caseApi.ts";

const apiBaseUrl = "http://localhost:3000";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function textResponse(body: string, init: ResponseInit): Response {
  return new Response(body, init);
}

describe("caseApiGetJson", () => {
  beforeEach(() => {
    vi.stubEnv("CASE_SERVICE_BASE_URL", apiBaseUrl);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("fetches the case API path through the supplied authenticated fetcher", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(caseApiGetJson("/v1/tax-plan-cycles", fetcher)).resolves.toEqual({ ok: true });

    expect(fetcher).toHaveBeenCalledWith(`${apiBaseUrl}/v1/tax-plan-cycles`, {
      credentials: "include",
    });
  });

  test("normalizes extra slashes against the case API base URL", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({ ok: true }));

    await caseApiGetJson("v1/tax-plan-cycles", fetcher);

    expect(fetcher).toHaveBeenCalledWith(`${apiBaseUrl}/v1/tax-plan-cycles`, {
      credentials: "include",
    });
  });

  test("throws a CaseApiError with the response body when the request fails", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      textResponse("unauthorized", { status: 401 }),
    );

    await expect(caseApiGetJson("/v1/tax-plan-cycles", fetcher)).rejects.toMatchObject({
      status: 401,
      body: "unauthorized",
    } satisfies Partial<CaseApiError>);
  });
});
