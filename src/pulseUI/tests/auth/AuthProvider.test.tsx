import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { AuthProvider, useSession } from "../../auth/AuthProvider.tsx";
import type { AuthClient } from "../../auth/authClient.ts";
import type { MfaChallenge, SessionTokenResponse } from "../../auth/session.ts";

const challenge: MfaChallenge = {
  tenantId: "tenant-synthetic-001",
  email: "advisor@example.test",
  userId: "user-synthetic-001",
};

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

const tokenResponse: SessionTokenResponse = {
  access_token: createAccessToken(),
  token_type: "Bearer",
  expires_in: 900,
  refresh_expires_in: 2_592_000,
};

function createClient(): AuthClient {
  return {
    login: vi.fn(async () => challenge),
    completeMfaLogin: vi.fn(async () => tokenResponse),
    refreshSession: vi.fn(async () => tokenResponse),
    logout: vi.fn(async () => undefined),
  };
}

function SessionProbe() {
  const session = useSession();
  const display =
    session.status === "authenticated"
      ? `${session.status}:${session.session.user.role}:${session.session.user.tenantId}`
      : session.status;

  return <output>{display}</output>;
}

afterEach(() => {
  cleanup();
});

describe("AuthProvider", () => {
  test("restores authenticated identity from the cookie-backed refresh request", async () => {
    const client = createClient();
    render(
      <AuthProvider client={client}>
        <SessionProbe />
      </AuthProvider>,
    );

    expect(screen.getByText("initializing")).toBeInTheDocument();
    expect(
      await screen.findByText("authenticated:Advisor:tenant-synthetic-001"),
    ).toBeInTheDocument();
    expect(client.refreshSession).toHaveBeenCalledTimes(1);
  });

  test("becomes anonymous when session restoration fails", async () => {
    const client = createClient();
    vi.mocked(client.refreshSession).mockRejectedValueOnce(new Error("expired"));
    render(
      <AuthProvider client={client}>
        <SessionProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText("anonymous")).toBeInTheDocument();
  });

  test("establishes identity after the MFA completion action", async () => {
    const client = createClient();
    vi.mocked(client.refreshSession).mockRejectedValueOnce(new Error("no session"));

    function MfaCompletionProbe() {
      const session = useSession();
      return (
        <>
          <SessionProbe />
          <button onClick={() => void session.completeMfaLogin(challenge, "123456")}>Complete MFA</button>
        </>
      );
    }

    render(
      <AuthProvider client={client}>
        <MfaCompletionProbe />
      </AuthProvider>,
    );

    await screen.findByText("anonymous");
    screen.getByRole("button", { name: "Complete MFA" }).click();

    expect(
      await screen.findByText("authenticated:Advisor:tenant-synthetic-001"),
    ).toBeInTheDocument();
    expect(client.completeMfaLogin).toHaveBeenCalledWith(challenge, "123456");
  });

  test("rejects hook use outside the provider", () => {
    expect(() => render(<SessionProbe />)).toThrow("useSession must be used within an AuthProvider");
  });
});
