import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";

import { createPulseRouter } from "../../app/createPulseRouter.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("renders reset form and pre-fills token from URL search param", async () => {
  render(
    <RouterProvider
      router={createPulseRouter(["/password-reset/new?token=prefilled-token-123"])}
    />,
  );

  expect(await screen.findByRole("heading", { name: "Set new password" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Reset token" })).toHaveValue("prefilled-token-123");
  expect(screen.getByLabelText("New password")).toBeInTheDocument();
  expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
});

test("submits valid reset details and displays success confirmation", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    jsonResponse({ reset: true }, 200),
  );

  render(
    <RouterProvider
      router={createPulseRouter(["/password-reset/new?token=valid-token-123"])}
    />,
  );

  expect(await screen.findByRole("heading", { name: "Set new password" })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "brand-new-password" },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: "brand-new-password" },
  });

  fireEvent.click(screen.getByRole("button", { name: "Reset password" }));

  expect(
    await screen.findByText(
      "Your password has been reset successfully. You can now sign in with your new password.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Return to sign in" })).toHaveAttribute(
    "href",
    "/sign-in",
  );

  expect(fetchSpy).toHaveBeenCalledWith(
    "/auth/reset-password",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        token: "valid-token-123",
        new_password: "brand-new-password",
      }),
    }),
  );
});

test("shows validation error when passwords do not match", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");

  render(
    <RouterProvider
      router={createPulseRouter(["/password-reset/new?token=token-123"])}
    />,
  );

  expect(await screen.findByRole("heading", { name: "Set new password" })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: "different-password" },
  });

  fireEvent.click(screen.getByRole("button", { name: "Reset password" }));

  expect(await screen.findByText("Passwords must match.")).toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("displays error message when token is invalid or expired", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    jsonResponse(
      {
        type: "https://taxpulse.example/problems/invalid-reset-token",
        title: "Invalid Reset Token",
        detail: "The reset token is invalid or has expired.",
      },
      401,
    ),
  );

  render(
    <RouterProvider
      router={createPulseRouter(["/password-reset/new?token=expired-token"])}
    />,
  );

  expect(await screen.findByRole("heading", { name: "Set new password" })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "brand-new-password" },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: "brand-new-password" },
  });

  fireEvent.click(screen.getByRole("button", { name: "Reset password" }));

  expect(
    await screen.findByText(
      "The reset token is invalid or has expired. Please request a new password reset.",
    ),
  ).toBeInTheDocument();
});
