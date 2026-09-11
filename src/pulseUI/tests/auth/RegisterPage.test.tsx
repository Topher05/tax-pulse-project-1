import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";

import { createPulseRouter } from "../../app/createPulseRouter.ts";

const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";
const workspaceSlug = "summit-ridge-tax";

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

function renderRegisterPage() {
  render(<RouterProvider router={createPulseRouter(["/register"])} />);
}

function fillValidForm(email = "new-client@example.test") {
  fireEvent.change(screen.getByRole("textbox", { name: "Firm workspace" }), {
    target: { value: workspaceSlug },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "synthetic-password" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "synthetic-password" },
  });
}

test("collects required registration details and validates password confirmation", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");

  renderRegisterPage();

  expect(await screen.findByRole("heading", { name: "Create your account" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/sign-in");

  fireEvent.change(screen.getByRole("textbox", { name: "Firm workspace" }), {
    target: { value: workspaceSlug },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
    target: { value: "new-client@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "synthetic-password" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "different-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Passwords must match.");
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("submits valid registration details and starts MFA setup", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    jsonResponse({
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
      tenant_id: tenantId,
      email: "new-client@example.test",
      role: "Client",
      status: "invited",
    }, 201),
  ).mockResolvedValueOnce(
    jsonResponse({
      provisioning_uri:
        "otpauth://totp/TaxPulse%20Advisory:new-client%40example.test?secret=FAKEBASE32SECRETFAKEBASE32SECRET&issuer=TaxPulse%20Advisory",
    }, 202),
  );

  renderRegisterPage();
  await screen.findByRole("heading", { name: "Create your account" });
  fillValidForm();
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));

  await waitFor(() => {
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/auth/register",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          workspace_slug: workspaceSlug,
          email: "new-client@example.test",
          password: "synthetic-password",
        }),
      }),
    );
  });
  expect(
    await screen.findByRole("heading", { name: "Set up MFA" }),
  ).toBeInTheDocument();
  expect(
    await screen.findByDisplayValue(
      "otpauth://totp/TaxPulse%20Advisory:new-client%40example.test?secret=FAKEBASE32SECRETFAKEBASE32SECRET&issuer=TaxPulse%20Advisory",
    ),
  ).toBeInTheDocument();
});

test("completes MFA setup after registration", async () => {
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      jsonResponse({
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
        tenant_id: tenantId,
        email: "new-client@example.test",
        role: "Client",
        status: "invited",
      }, 201),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        provisioning_uri:
          "otpauth://totp/TaxPulse%20Advisory:new-client%40example.test?secret=FAKEBASE32SECRETFAKEBASE32SECRET&issuer=TaxPulse%20Advisory",
      }, 202),
    )
    .mockResolvedValueOnce(jsonResponse({ enrolled: true }));

  renderRegisterPage();
  await screen.findByRole("heading", { name: "Create your account" });
  fillValidForm();
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  await screen.findByDisplayValue(
    "otpauth://totp/TaxPulse%20Advisory:new-client%40example.test?secret=FAKEBASE32SECRETFAKEBASE32SECRET&issuer=TaxPulse%20Advisory",
  );

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
          user_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
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

test("shows duplicate email errors without clearing valid form entries", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    jsonResponse({
      type: "https://taxpulse.example/problems/email-already-registered",
      title: "Email Already Registered",
      status: 409,
      detail: "An account with this email is already registered for this tenant.",
      code: "EMAIL_ALREADY_REGISTERED",
    }, 409),
  );

  renderRegisterPage();
  await screen.findByRole("heading", { name: "Create your account" });
  fillValidForm("existing-client@example.test");
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "An account with this email is already registered for this workspace.",
  );
  expect(screen.getByRole("textbox", { name: "Firm workspace" })).toHaveValue(workspaceSlug);
  expect(screen.getByRole("textbox", { name: "Email address" })).toHaveValue(
    "existing-client@example.test",
  );
  expect(screen.getByLabelText("Password")).toHaveValue("synthetic-password");
  expect(screen.getByLabelText("Confirm password")).toHaveValue("synthetic-password");
});
