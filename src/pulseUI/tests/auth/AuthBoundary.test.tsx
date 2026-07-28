import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { AuthBoundary } from "../../auth/AuthBoundary.tsx";
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

function createClient(): AuthClient {
  return {
    login: vi.fn(),
    completeMfaLogin: vi.fn(),
    refreshSession: vi.fn(async () => response),
    logout: vi.fn(),
  };
}

afterEach(cleanup);

describe("AuthBoundary", () => {
  test("shows a restoration state before protected workspace content", () => {
    let resolveRefresh: (value: SessionTokenResponse) => void = () => undefined;
    const client = createClient();
    vi.mocked(client.refreshSession).mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    render(
      <AuthProvider client={client}>
        <AuthBoundary><p>Protected workspace</p></AuthBoundary>
      </AuthProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Restoring your session");
    expect(screen.queryByText("Protected workspace")).not.toBeInTheDocument();
    resolveRefresh(response);
  });

  test("blocks protected workspace content when session restoration fails", async () => {
    const client = createClient();
    vi.mocked(client.refreshSession).mockRejectedValueOnce(new Error("expired"));
    render(
      <AuthProvider client={client}>
        <AuthBoundary><p>Protected workspace</p></AuthBoundary>
      </AuthProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Sign in required" })).toBeInTheDocument();
    expect(screen.queryByText("Protected workspace")).not.toBeInTheDocument();
  });

  test("renders protected workspace content for an authenticated session", async () => {
    render(
      <AuthProvider client={createClient()}>
        <AuthBoundary><p>Protected workspace</p></AuthBoundary>
      </AuthProvider>,
    );

    expect(await screen.findByText("Protected workspace")).toBeInTheDocument();
  });
});
