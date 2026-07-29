import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";

import { createPulseRouter } from "../../app/createPulseRouter.ts";
import { AuthProvider } from "../../auth/AuthProvider.tsx";
import type { AuthClient } from "../../auth/authClient.ts";
import type { MfaChallenge, SessionTokenResponse } from "../../auth/session.ts";

const challenge: MfaChallenge = {
  tenantId: "tenant-synthetic-001",
  email: "advisor@example.test",
  userId: "user-synthetic-001",
};

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(cleanup);

function createAccessToken(): string {
  const claims = btoa(
    JSON.stringify({
      sub: challenge.userId,
      role: "Advisor",
      tenant_id: challenge.tenantId,
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

test("submits credentials and sends the returned MFA challenge to the MFA route", async () => {
  const client: AuthClient = {
    login: vi.fn(async () => challenge),
    completeMfaLogin: vi.fn(),
    refreshSession: vi.fn(async () => {
      throw new Error("No existing session.");
    }),
    logout: vi.fn(),
  };

  render(
    <AuthProvider client={client}>
      <RouterProvider router={createPulseRouter(["/sign-in"])} />
    </AuthProvider>,
  );

  fireEvent.change(await screen.findByRole("textbox", { name: "Workspace ID" }), {
    target: { value: challenge.tenantId },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
    target: { value: challenge.email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "synthetic-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  await vi.waitFor(() => expect(client.login).toHaveBeenCalledWith({
    tenantId: challenge.tenantId,
    email: challenge.email,
    password: "synthetic-password",
  }));
  expect(
    await screen.findByText(`Enter the verification code from your authenticator app for ${challenge.email}.`),
  ).toBeInTheDocument();
});

test("completes MFA, routes to the dashboard, and returns to sign-in after logout", async () => {
  const client: AuthClient = {
    login: vi.fn(async () => challenge),
    completeMfaLogin: vi.fn(async () => tokenResponse),
    refreshSession: vi.fn(async () => {
      throw new Error("No existing session.");
    }),
    logout: vi.fn(),
  };

  render(
    <AuthProvider client={client}>
      <RouterProvider router={createPulseRouter(["/sign-in"])} />
    </AuthProvider>,
  );

  fireEvent.change(await screen.findByRole("textbox", { name: "Workspace ID" }), {
    target: { value: challenge.tenantId },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
    target: { value: challenge.email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "synthetic-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  fireEvent.change(await screen.findByRole("textbox", { name: "Verification code" }), {
    target: { value: "123456" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Verify and sign in" }));

  await vi.waitFor(() => expect(client.completeMfaLogin).toHaveBeenCalledWith(challenge, "123456"));
  expect(await screen.findByRole("heading", { name: "Dashboard", level: 1 })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

  await vi.waitFor(() => expect(client.logout).toHaveBeenCalledTimes(1));
  expect(
    await screen.findByRole("heading", { name: "Sign in to TaxPulse Advisory", level: 1 }),
  ).toBeInTheDocument();
});
