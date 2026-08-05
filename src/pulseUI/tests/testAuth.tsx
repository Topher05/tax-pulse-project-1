import type React from "react";

import { AuthProvider } from "../auth/AuthProvider.tsx";
import type { AuthClient } from "../auth/authClient.ts";
import type { MfaChallenge, SessionTokenResponse } from "../auth/session.ts";

const challenge: MfaChallenge = {
  tenantId: "tenant-synthetic-001",
  email: "advisor@example.test",
  userId: "user-synthetic-001",
};

export function createTestAccessToken(): string {
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

export const testTokenResponse: SessionTokenResponse = {
  access_token: createTestAccessToken(),
  token_type: "Bearer",
  expires_in: 900,
  refresh_expires_in: 2_592_000,
};

export function createTestAuthClient(authenticated = true): AuthClient {
  return {
    login: async () => challenge,
    completeMfaLogin: async () => testTokenResponse,
    refreshSession: authenticated
      ? async () => testTokenResponse
      : async () => {
        throw new Error("No active test session.");
      },
    logout: async () => undefined,
  };
}

export function TestAuthProvider({
  authenticated = true,
  children,
}: {
  readonly authenticated?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <AuthProvider client={createTestAuthClient(authenticated)}>
      {children}
    </AuthProvider>
  );
}
