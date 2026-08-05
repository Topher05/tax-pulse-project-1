import type React from "react";

import { AuthProvider } from "../auth/AuthProvider.tsx";
import type { AuthClient } from "../auth/authClient.ts";
import type { MfaChallenge, SessionRole, SessionTokenResponse } from "../auth/session.ts";

const challenge: MfaChallenge = {
  tenantId: "tenant-synthetic-001",
  email: "advisor@example.test",
  userId: "user-synthetic-001",
};

export function createTestAccessToken(role: SessionRole = "Advisor"): string {
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

export const testTokenResponse: SessionTokenResponse = {
  access_token: createTestAccessToken(),
  token_type: "Bearer",
  expires_in: 900,
  refresh_expires_in: 2_592_000,
};

export function createTestAuthClient(
  authenticated = true,
  role: SessionRole = "Advisor",
): AuthClient {
  const response: SessionTokenResponse = {
    access_token: createTestAccessToken(role),
    token_type: "Bearer",
    expires_in: 900,
    refresh_expires_in: 2_592_000,
  };

  return {
    login: async () => challenge,
    completeMfaLogin: async () => response,
    refreshSession: authenticated
      ? async () => response
      : async () => {
          throw new Error("No active test session.");
        },
    logout: async () => undefined,
  };
}

export function TestAuthProvider({
  authenticated = true,
  role = "Advisor",
  children,
}: {
  readonly authenticated?: boolean;
  readonly role?: SessionRole;
  readonly children: React.ReactNode;
}) {
  return (
    <AuthProvider client={createTestAuthClient(authenticated, role)}>
      {children}
    </AuthProvider>
  );
}
