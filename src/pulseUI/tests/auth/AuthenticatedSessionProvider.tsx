import type { PropsWithChildren } from "react";

import { AuthProvider } from "../../auth/AuthProvider.tsx";
import type { AuthClient } from "../../auth/authClient.ts";
import type { SessionTokenResponse } from "../../auth/session.ts";

function createAccessToken(): string {
  const claims = btoa(
    JSON.stringify({
      sub: "user-synthetic-001",
      role: "Advisor",
      tenant_id: "tenant-synthetic-001",
      exp: 1_800_000_000,
    }),
  ).replace(/=/g, "");
  return `header.${claims}.signature`;
}

const response: SessionTokenResponse = {
  access_token: createAccessToken(),
  token_type: "Bearer",
  expires_in: 900,
  refresh_expires_in: 2_592_000,
};

const client: AuthClient = {
  login: async () => {
    throw new Error("Login is not used by workspace route tests.");
  },
  completeMfaLogin: async () => response,
  refreshSession: async () => response,
  logout: async () => undefined,
};

export function AuthenticatedSessionProvider({ children }: PropsWithChildren) {
  return <AuthProvider client={client}>{children}</AuthProvider>;
}
