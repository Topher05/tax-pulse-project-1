import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";

import { createBrowserAuthClient, type AuthClient } from "./authClient.ts";
import {
  createAuthenticatedSession,
  type AuthSessionState,
  type LoginCredentials,
  type MfaChallenge,
  type SessionContextValue,
} from "./session.ts";

const AuthContext = createContext<SessionContextValue | null>(null);
const refreshLeewayMilliseconds = 60_000;

export interface AuthProviderProps extends PropsWithChildren {
  readonly client?: AuthClient;
  readonly clearCachedData?: () => void | Promise<void>;
}

function toAuthenticatedState(response: Awaited<ReturnType<AuthClient["refreshSession"]>>): AuthSessionState {
  const session = createAuthenticatedSession(response);
  return session === null ? { status: "anonymous" } : { status: "authenticated", session };
}

export function AuthProvider({
  children,
  client: suppliedClient,
  clearCachedData = () => undefined,
}: AuthProviderProps) {
  const client = useMemo(() => suppliedClient ?? createBrowserAuthClient(), [suppliedClient]);
  const [state, setState] = useState<AuthSessionState>({ status: "initializing" });

  const requestRefresh = useCallback(async (): Promise<AuthSessionState> => {
    try {
      const nextState = toAuthenticatedState(await client.refreshSession());
      setState(nextState);
      return nextState;
    } catch {
      const nextState: AuthSessionState = { status: "anonymous" };
      setState(nextState);
      return nextState;
    }
  }, [client]);

  const refreshSession = useCallback(async () => {
    await requestRefresh();
  }, [requestRefresh]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<MfaChallenge> => await client.login(credentials),
    [client],
  );

  const completeMfaLogin = useCallback(
    async (challenge: MfaChallenge, code: string) => {
      setState(toAuthenticatedState(await client.completeMfaLogin(challenge, code)));
    },
    [client],
  );

  const logout = useCallback(async () => {
    try {
      await client.logout();
    } finally {
      try {
        await clearCachedData();
      } finally {
        setState({ status: "anonymous" });
      }
    }
  }, [clearCachedData, client]);

  const getAccessToken = useCallback(async () => {
    if (state.status !== "authenticated") {
      return null;
    }

    if (state.session.accessTokenExpiresAt > Date.now() + refreshLeewayMilliseconds) {
      return state.session.accessToken;
    }

    const nextState = await requestRefresh();
    return nextState.status === "authenticated" ? nextState.session.accessToken : null;
  }, [requestRefresh, state]);

  const value = useMemo<SessionContextValue>(
    () => ({ ...state, login, completeMfaLogin, logout, refreshSession, getAccessToken }),
    [completeMfaLogin, getAccessToken, login, logout, refreshSession, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession(): SessionContextValue {
  const session = useContext(AuthContext);
  if (session === null) {
    throw new Error("useSession must be used within an AuthProvider.");
  }
  return session;
}
