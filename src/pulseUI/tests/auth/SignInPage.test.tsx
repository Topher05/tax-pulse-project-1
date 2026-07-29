import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, expect, test, vi } from "vitest";

import { createPulseRouter } from "../../app/createPulseRouter.ts";
import { AuthProvider } from "../../auth/AuthProvider.tsx";
import type { AuthClient } from "../../auth/authClient.ts";
import type { MfaChallenge } from "../../auth/session.ts";

const challenge: MfaChallenge = {
  tenantId: "tenant-synthetic-001",
  email: "advisor@example.test",
  userId: "user-synthetic-001",
};

beforeAll(() => {
  window.scrollTo = vi.fn();
});

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
