import { afterEach, describe, expect, test, vi } from "vitest";

import {
  clearPulseSession,
  pulseAccessTokenStorageKey,
  pulseRefreshTokenStorageKey,
  storePulseSession,
} from "../app/authSession.ts";
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

function stubFetch(...responses: readonly Response[]) {
  const fetchMock = vi.fn<typeof fetch>();

  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response);
  }

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("caseApiGetJson", () => {
  afterEach(() => {
    clearPulseSession();
    vi.unstubAllGlobals();
  });

  test("attaches the stored access token to API requests", async () => {
    storePulseSession({ accessToken: "signed-access-token" });
    const fetchMock = stubFetch(jsonResponse({ ok: true }));

    await expect(caseApiGetJson("/v1/tax-plan-cycles")).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(`${apiBaseUrl}/v1/tax-plan-cycles`, {
      headers: { authorization: "Bearer signed-access-token" },
    });
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: { authorization: "Bearer your-token-for-testing" },
      }),
    );
  });

  test("throws 401 without calling the backend when no access token exists", async () => {
    localStorage.setItem(pulseRefreshTokenStorageKey, "stale-refresh-token");
    const fetchMock = stubFetch(jsonResponse({ ok: true }));

    await expect(caseApiGetJson("/v1/tax-plan-cycles")).rejects.toBeInstanceOf(CaseApiError);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(pulseAccessTokenStorageKey)).toBeNull();
    expect(localStorage.getItem(pulseRefreshTokenStorageKey)).toBeNull();
  });

  test("refreshes on 401, stores rotated tokens, and retries the original request once", async () => {
    storePulseSession({
      accessToken: "expired-access-token",
      refreshToken: "refresh-token",
    });
    const fetchMock = stubFetch(
      textResponse("expired", { status: 401 }),
      jsonResponse({ access_token: "fresh-access-token", refresh_token: "rotated-refresh-token" }),
      jsonResponse({ cycles: [] }),
    );

    await expect(caseApiGetJson("/v1/tax-plan-cycles")).resolves.toEqual({ cycles: [] });

    expect(fetchMock).toHaveBeenNthCalledWith(1, `${apiBaseUrl}/v1/tax-plan-cycles`, {
      headers: { authorization: "Bearer expired-access-token" },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${apiBaseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: "refresh-token" }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, `${apiBaseUrl}/v1/tax-plan-cycles`, {
      headers: { authorization: "Bearer fresh-access-token" },
    });
    expect(localStorage.getItem(pulseAccessTokenStorageKey)).toBe("fresh-access-token");
    expect(localStorage.getItem(pulseRefreshTokenStorageKey)).toBe("rotated-refresh-token");
  });

  test("clears tokens when refresh fails", async () => {
    storePulseSession({
      accessToken: "expired-access-token",
      refreshToken: "bad-refresh-token",
    });
    const fetchMock = stubFetch(
      textResponse("expired", { status: 401 }),
      textResponse("refresh failed", { status: 401 }),
    );

    await expect(caseApiGetJson("/v1/tax-plan-cycles")).rejects.toMatchObject({
      status: 401,
      body: "expired",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(pulseAccessTokenStorageKey)).toBeNull();
    expect(localStorage.getItem(pulseRefreshTokenStorageKey)).toBeNull();
  });

  test("clears tokens when the retried request still returns 401", async () => {
    storePulseSession({
      accessToken: "expired-access-token",
      refreshToken: "refresh-token",
    });
    const fetchMock = stubFetch(
      textResponse("expired", { status: 401 }),
      jsonResponse({ access_token: "fresh-access-token" }),
      textResponse("still unauthorized", { status: 401 }),
    );

    await expect(caseApiGetJson("/v1/tax-plan-cycles")).rejects.toMatchObject({
      status: 401,
      body: "still unauthorized",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem(pulseAccessTokenStorageKey)).toBeNull();
    expect(localStorage.getItem(pulseRefreshTokenStorageKey)).toBeNull();
  });
});
