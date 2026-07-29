import "@testing-library/jest-dom/vitest";

import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  return <output>{`${display}:${session.isAuthenticated}:${session.user?.tenantId ?? "none"}`}</output>;
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

    expect(screen.getByText("initializing:false:none")).toBeInTheDocument();
    expect(
      await screen.findByText("authenticated:Advisor:tenant-synthetic-001:true:tenant-synthetic-001"),
    ).toBeInTheDocument();
    expect(client.refreshSession).toHaveBeenCalledTimes(1);
  });

  test("becomes anonymous when session restoration fails", async () => {
    const client = createClient();
    const clearCachedData = vi.fn();
    vi.mocked(client.refreshSession).mockRejectedValueOnce(new Error("expired"));
    render(
      <AuthProvider client={client} clearCachedData={clearCachedData}>
        <SessionProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText("anonymous:false:none")).toBeInTheDocument();
    expect(clearCachedData).toHaveBeenCalledTimes(1);
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

    await screen.findByText("anonymous:false:none");
    screen.getByRole("button", { name: "Complete MFA" }).click();

    expect(
      await screen.findByText("authenticated:Advisor:tenant-synthetic-001:true:tenant-synthetic-001"),
    ).toBeInTheDocument();
    expect(client.completeMfaLogin).toHaveBeenCalledWith(challenge, "123456");
  });

  test("delegates login to the shared client without setting a session before MFA", async () => {
    const client = createClient();
    vi.mocked(client.refreshSession).mockRejectedValueOnce(new Error("no session"));

    function LoginProbe() {
      const session = useSession();
      return <button onClick={() => void session.login({
        tenantId: challenge.tenantId,
        email: challenge.email,
        password: "synthetic-password",
      })}>Login</button>;
    }

    render(
      <AuthProvider client={client}>
        <LoginProbe />
      </AuthProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Login" }));

    await vi.waitFor(() => expect(client.login).toHaveBeenCalledWith({
      tenantId: challenge.tenantId,
      email: challenge.email,
      password: "synthetic-password",
    }));
  });

  test("refreshes an access token within the renewal leeway before returning it", async () => {
    const client = createClient();
    const expiringResponse = { ...tokenResponse, expires_in: 1 };
    const refreshedResponse = { ...tokenResponse, access_token: `${createAccessToken()}-refreshed` };
    vi.mocked(client.refreshSession)
      .mockResolvedValueOnce(expiringResponse)
      .mockResolvedValueOnce(refreshedResponse);

    function AccessTokenProbe() {
      const session = useSession();
      const [token, setToken] = useState<string | null>(null);
      return (
        <>
          <span>{session.status}</span>
          <button onClick={() => void session.getAccessToken().then(setToken)}>Read token</button>
          <output>{token ?? "no token"}</output>
        </>
      );
    }

    render(
      <AuthProvider client={client}>
        <AccessTokenProbe />
      </AuthProvider>,
    );

    await screen.findByText("authenticated");
    fireEvent.click(screen.getByRole("button", { name: "Read token" }));

    expect(await screen.findByText(`${createAccessToken()}-refreshed`)).toBeInTheDocument();
    expect(client.refreshSession).toHaveBeenCalledTimes(2);
  });

  test("clears supplied cached data even when the logout request fails", async () => {
    const client = createClient();
    const clearCachedData = vi.fn();
    vi.mocked(client.logout).mockRejectedValueOnce(new Error("offline"));

    function LogoutProbe() {
      const session = useSession();
      return <button onClick={() => void session.logout().catch(() => undefined)}>Logout</button>;
    }

    render(
      <AuthProvider client={client} clearCachedData={clearCachedData}>
        <LogoutProbe />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));

    await vi.waitFor(() => expect(clearCachedData).toHaveBeenCalledTimes(1));
  });

  test("rejects hook use outside the provider", () => {
    expect(() => render(<SessionProbe />)).toThrow("useSession must be used within an AuthProvider");
  });
});
