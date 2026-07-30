import { useMemo } from "react";

import { useSession } from "./AuthProvider.tsx";
import type { AuthSessionState } from "./session.ts";

export interface AuthenticatedRequestSession {
  getAccessToken(): Promise<string | null>;
  refreshSession(): Promise<AuthSessionState>;
  logout(): Promise<void>;
}

function withBearerToken(input: RequestInfo | URL, init: RequestInit | undefined, token: string): RequestInit {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
  headers.set("authorization", `Bearer ${token}`);

  return { ...init, headers };
}

/**
 * Attaches the current access token and performs at most one refresh-and-retry for a 401.
 */
export function createAuthenticatedFetch(
  session: AuthenticatedRequestSession,
  fetcher: typeof fetch = fetch,
): typeof fetch {
  return async (input, init) => {
    const token = await session.getAccessToken();
    if (token === null) {
      return new Response(null, { status: 401, statusText: "Authentication Required" });
    }

    const firstResponse = await fetcher(input, withBearerToken(input, init, token));
    if (firstResponse.status !== 401) {
      return firstResponse;
    }

    const refreshedSession = await session.refreshSession();
    if (refreshedSession.status !== "authenticated") {
      await session.logout();
      return firstResponse;
    }

    const retryResponse = await fetcher(
      input,
      withBearerToken(input, init, refreshedSession.session.accessToken),
    );
    if (retryResponse.status === 401) {
      await session.logout();
    }
    return retryResponse;
  };
}

export function useAuthenticatedFetch(): typeof fetch {
  const session = useSession();
  return useMemo(
    () => createAuthenticatedFetch(session),
    [session],
  );
}
