import "@testing-library/jest-dom/vitest";

import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";

import { routeTree } from "../../app/routeTree.tsx";

const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";
const userId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61";
const provisioningUri =
  "otpauth://totp/TaxPulse%20Advisory:new-client%40example.test?secret=FAKEBASE32SECRETFAKEBASE32SECRET&issuer=TaxPulse%20Advisory";

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

function renderEnrollmentPageWithState() {
  const history = createMemoryHistory({
    initialEntries: ["/register/mfa"],
  });

  const router = createRouter({ routeTree, history });
  void router.navigate({
    to: "/register/mfa",
    state: {
      mfaChallenge: {
        tenantId,
        email: "new-client@example.test",
        userId,
      },
    },
  });

  render(<RouterProvider router={router} />);
}

test("requires registration state before starting MFA setup", async () => {
  render(<RouterProvider router={createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ["/register/mfa"] }) })} />);

  expect(await screen.findByRole("heading", { name: "Set up MFA" })).toBeInTheDocument();
  expect(screen.getByText("Start registration before setting up an authenticator app.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to registration" })).toHaveAttribute(
    "href",
    "/register",
  );
});

test("starts enrollment and shows only the provisioning URI returned by the backend", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ provisioning_uri: provisioningUri }, 202));

  renderEnrollmentPageWithState();

  expect(await screen.findByDisplayValue(provisioningUri)).toBeInTheDocument();
  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/mfa/enroll",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        tenant_id: tenantId,
        user_id: userId,
      }),
    }),
  );
});

test("shows invalid-code errors without clearing the provisioning URI", async () => {
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(jsonResponse({ provisioning_uri: provisioningUri }, 202))
    .mockResolvedValueOnce(
      jsonResponse({
        type: "https://taxpulse.example/problems/mfa-invalid-code",
        title: "Invalid MFA Code",
        status: 401,
        detail: "The submitted MFA code is invalid.",
      }, 401),
    );

  renderEnrollmentPageWithState();
  await screen.findByDisplayValue(provisioningUri);
  fireEvent.change(screen.getByRole("textbox", { name: "Verification code" }), {
    target: { value: "654321" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Enable MFA" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The verification code is not valid. Try the current code from your authenticator app.",
  );
  expect(screen.getByDisplayValue(provisioningUri)).toBeInTheDocument();
});

test("confirms enrollment and links back to sign in", async () => {
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(jsonResponse({ provisioning_uri: provisioningUri }, 202))
    .mockResolvedValueOnce(jsonResponse({ enrolled: true }));

  renderEnrollmentPageWithState();
  await screen.findByDisplayValue(provisioningUri);
  fireEvent.change(screen.getByRole("textbox", { name: "Verification code" }), {
    target: { value: "123456" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Enable MFA" }));

  await waitFor(() => {
    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      "/mfa/enroll/confirm",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: userId,
          code: "123456",
        }),
      }),
    );
  });
  expect(await screen.findByRole("status")).toHaveTextContent(
    "MFA is enabled. You can now sign in with your authenticator app.",
  );
  expect(screen.getByRole("link", { name: "Continue to sign in" })).toHaveAttribute(
    "href",
    "/sign-in",
  );
});
