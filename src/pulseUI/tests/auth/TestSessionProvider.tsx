import { useMemo, type PropsWithChildren } from "react";

import { AuthProvider } from "../../auth/AuthProvider.tsx";
import type { AuthClient } from "../../auth/authClient.ts";
import type { SessionRole, SessionTokenResponse } from "../../auth/session.ts";

function createAccessToken(role: SessionRole): string {
  const claims = btoa(
    JSON.stringify({
      sub: "user-synthetic-001",
      role,
      tenant_id: "tenant-synthetic-001",
      exp: 1_800_000_000,
    }),
  ).replace(/=/g, "");
  return `header.${claims}.signature`;
}

export interface TestSessionProviderProps extends PropsWithChildren {
  readonly authenticated?: boolean;
  readonly role?: SessionRole;
  readonly clientOverrides?: Partial<AuthClient>;
}

export function TestSessionProvider({
  authenticated = true,
  role = "Advisor",
  children,
  clientOverrides,
}: TestSessionProviderProps) {
  const client = useMemo<AuthClient>(
    () => ({
      login: async () => {
        throw new Error("Login is not used by workspace route tests.");
      },
      completeMfaLogin: async () => ({
        access_token: createAccessToken(role),
        token_type: "Bearer",
        expires_in: 900,
        refresh_expires_in: 2_592_000,
      }),
      refreshSession: authenticated
        ? async () => ({
            access_token: createAccessToken(role),
            token_type: "Bearer",
            expires_in: 900,
            refresh_expires_in: 2_592_000,
          })
        : async () => {
            throw new Error("No existing session.");
          },
      logout: async () => undefined,
      ...clientOverrides,
    }),
    [authenticated, clientOverrides, role],
  );

  return <AuthProvider client={client}>{children}</AuthProvider>;
}
