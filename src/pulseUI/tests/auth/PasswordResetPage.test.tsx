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

test("submits email to forgot-password endpoint and shows confirmation page", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    jsonResponse({ accepted: true }, 202),
  );

  render(<RouterProvider router={createPulseRouter(["/password-reset"])} />);

  expect(await screen.findByRole("heading", { name: "Reset your password" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/sign-in");

  fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
    target: { value: "advisor@example.test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  expect(await screen.findByRole("heading", { name: "Check your email" })).toBeInTheDocument();
  expect(fetchSpy).toHaveBeenCalledWith(
    "/auth/forgot-password",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "advisor@example.test" }),
    }),
  );
});

test("displays error message on request failure without clearing form input", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    jsonResponse(
      {
        type: "https://taxpulse.example/problems/validation-error",
        detail: "Request body failed validation.",
      },
      400,
    ),
  );

  render(<RouterProvider router={createPulseRouter(["/password-reset"])} />);

  const emailInput = await screen.findByRole("textbox", { name: "Email address" });
  fireEvent.change(emailInput, {
    target: { value: "advisor@example.test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  await waitFor(() => {
    expect(
      screen.getByText("Unable to process your request. Please try again."),
    ).toBeInTheDocument();
  });
  expect(emailInput).toHaveValue("advisor@example.test");
});
