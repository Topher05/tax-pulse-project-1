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

test("signs in through MFA, reaches the dashboard, and returns to sign-in after logout", async () => {
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

  expect(await screen.findByRole("link", { name: "Forgot your password?" })).toHaveAttribute(
    "href",
    "/password-reset",
  );

  fireEvent.change(await screen.findByRole("textbox", { name: "Email address" }), {
    target: { value: challenge.email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "synthetic-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  await vi.waitFor(() => expect(client.login).toHaveBeenCalledWith({
    email: challenge.email,
    password: "synthetic-password",
  }));
  expect(
    await screen.findByText(`Enter the verification code from your authenticator app for ${challenge.email}.`),
  ).toBeInTheDocument();

  fireEvent.change(screen.getByRole("textbox", { name: "Verification code" }), {
    target: { value: "123456" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Verify and sign in" }));

  await vi.waitFor(() => expect(client.completeMfaLogin).toHaveBeenCalledWith(challenge, "123456"));
  expect(await screen.findByRole("heading", { name: "Dashboard", level: 1 })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

  await vi.waitFor(() => expect(client.logout).toHaveBeenCalledTimes(1));
  expect(
    await screen.findByRole("heading", { name: "Sign in to your workspace", level: 1 }),
  ).toBeInTheDocument();
});

test("shows an error and stays on sign-in when credentials are rejected", async () => {
  const client: AuthClient = {
    login: vi.fn(async () => {
      throw new Error("Invalid credentials.");
    }),
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

  fireEvent.change(await screen.findByRole("textbox", { name: "Email address" }), {
    target: { value: challenge.email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "incorrect-synthetic-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  expect(
    await screen.findByRole("alert"),
  ).toHaveTextContent("Unable to sign in. Check your credentials and try again.");
  expect(client.login).toHaveBeenCalledWith({
    email: challenge.email,
    password: "incorrect-synthetic-password",
  });
  expect(client.completeMfaLogin).not.toHaveBeenCalled();
  expect(
    screen.getByRole("heading", { name: "Sign in to your workspace", level: 1 }),
  ).toBeInTheDocument();
});

test("shows an error and does not establish a session when MFA verification fails", async () => {
  const client: AuthClient = {
    login: vi.fn(async () => challenge),
    completeMfaLogin: vi.fn(async () => {
      throw new Error("Invalid verification code.");
    }),
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

  fireEvent.change(await screen.findByRole("textbox", { name: "Email address" }), {
    target: { value: challenge.email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "synthetic-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  fireEvent.change(await screen.findByRole("textbox", { name: "Verification code" }), {
    target: { value: "654321" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Verify and sign in" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to verify your code. Please try again.",
  );
  expect(client.completeMfaLogin).toHaveBeenCalledWith(challenge, "654321");
  expect(screen.queryByRole("heading", { name: "Dashboard", level: 1 })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Verify your identity", level: 1 })).toBeInTheDocument();
});

test("rejects direct MFA access without an ephemeral challenge", async () => {
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
      <RouterProvider router={createPulseRouter(["/sign-in/mfa"])} />
    </AuthProvider>,
  );

  expect(
    await screen.findByText("Start by signing in to request a verification code."),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute(
    "href",
    "/sign-in",
  );
  expect(screen.queryByRole("textbox", { name: "Verification code" })).not.toBeInTheDocument();
  expect(client.completeMfaLogin).not.toHaveBeenCalled();
});
