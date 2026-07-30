import { describe, expect, test, vi } from "vitest";

import {
  createAuthenticatedFetch,
  type AuthenticatedRequestSession,
} from "../../auth/authenticatedFetch.ts";
import type { AuthSessionState } from "../../auth/session.ts";

const anonymousState: AuthSessionState = { status: "anonymous" };

function createSession(
  accessTokens: Array<string | null>,
  refreshedState: AuthSessionState = anonymousState,
): AuthenticatedRequestSession {
  return {
    getAccessToken: vi.fn(async () => accessTokens.shift() ?? null),
    refreshSession: vi.fn(async () => refreshedState),
    logout: vi.fn(async () => undefined),
  };
}

describe("authenticated fetch", () => {
  test("refreshes once after a 401 and retries with the replacement access token", async () => {
    const session = createSession(["access-token-1"], {
      status: "authenticated",
      session: {
        accessToken: "access-token-2",
        accessTokenExpiresAt: 1_800_000_000_000,
        refreshTokenExpiresAt: 1_800_002_592_000,
        user: { userId: "user-synthetic-001", role: "Advisor", tenantId: "tenant-synthetic-001" },
      },
    });
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const response = await createAuthenticatedFetch(session, fetcher)("/v1/cycles");

    expect(response.status).toBe(200);
    expect(session.refreshSession).toHaveBeenCalledTimes(1);
    expect(session.logout).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "/v1/cycles",
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(
      "Bearer access-token-1",
    );
    expect(new Headers(fetcher.mock.calls[1]?.[1]?.headers).get("authorization")).toBe(
      "Bearer access-token-2",
    );
  });

  test("invalidates the session after the single retry is also unauthorized", async () => {
    const session = createSession(["access-token-1"], {
      status: "authenticated",
      session: {
        accessToken: "access-token-2",
        accessTokenExpiresAt: 1_800_000_000_000,
        refreshTokenExpiresAt: 1_800_002_592_000,
        user: { userId: "user-synthetic-001", role: "Advisor", tenantId: "tenant-synthetic-001" },
      },
    });
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 401 }));

    const response = await createAuthenticatedFetch(session, fetcher)("/v1/cycles");

    expect(response.status).toBe(401);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(session.refreshSession).toHaveBeenCalledTimes(1);
    expect(session.logout).toHaveBeenCalledTimes(1);
  });

  test("does not send a request when no authenticated session exists", async () => {
    const session = createSession([null]);
    const fetcher = vi.fn<typeof fetch>();

    const response = await createAuthenticatedFetch(session, fetcher)("/v1/cycles");

    expect(response.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
