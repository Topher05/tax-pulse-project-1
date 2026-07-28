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

export interface AuthProviderProps extends PropsWithChildren {
  readonly client?: AuthClient;
}

function toAuthenticatedState(response: Awaited<ReturnType<AuthClient["refreshSession"]>>): AuthSessionState {
  const session = createAuthenticatedSession(response);
  return session === null ? { status: "anonymous" } : { status: "authenticated", session };
}

export function AuthProvider({ children, client: suppliedClient }: AuthProviderProps) {
  const client = useMemo(() => suppliedClient ?? createBrowserAuthClient(), [suppliedClient]);
  const [state, setState] = useState<AuthSessionState>({ status: "initializing" });

  const refreshSession = useCallback(async () => {
    try {
      setState(toAuthenticatedState(await client.refreshSession()));
    } catch {
      setState({ status: "anonymous" });
    }
  }, [client]);

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
      setState({ status: "anonymous" });
    }
  }, [client]);

  const getAccessToken = useCallback(async () => {
    return state.status === "authenticated" ? state.session.accessToken : null;
  }, [state]);

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
