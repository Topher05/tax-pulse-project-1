import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../app/queryClient.ts";
import { createPulseRouter } from "../app/createPulseRouter.ts";
import type { AuthClient } from "../auth/authClient.ts";
import { TestSessionProvider } from "./auth/TestSessionProvider.tsx";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

const renderShell = (
  initialPath: string = "/",
  authenticated = true,
  clientOverrides?: Partial<AuthClient>,
) => {
  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <TestSessionProvider
        authenticated={authenticated}
        clientOverrides={clientOverrides}
      >
        <RouterProvider router={createPulseRouter([initialPath])} />
      </TestSessionProvider>
    </QueryClientProvider>,
  );
};

describe("Pulse UI app shell", () => {
  test("does not register the obsolete login route", () => {
    expect(Object.keys(createPulseRouter().routesByPath)).not.toContain("/login");
  });

  test.each(["/", "/cycles/queue", "/administration/tenants-users"])(
    "redirects unauthenticated route %s to sign-in",
    async (initialPath) => {
      renderShell(initialPath, false);

      expect(
        await screen.findByRole("heading", { name: "Sign in to your workspace", level: 1 }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeInTheDocument();
    },
  );

  test("renders the workspace sidebar heading", async () => {
    renderShell("/cycles/queue");

    const primaryNav = await screen.findByRole("navigation", { name: "Primary" });

    expect(within(primaryNav).getByRole("heading", { name: "Workspace" })).toBeInTheDocument();
  });

  test("renders the plan tools sidebar heading", async () => {
    renderShell("/cycles/queue");

    const primaryNav = await screen.findByRole("navigation", { name: "Primary" });

    expect(within(primaryNav).getByRole("heading", { name: "Plan Tools" })).toBeInTheDocument();
  });

  test("renders the administration sidebar heading", async () => {
    renderShell("/cycles/queue");

    const primaryNav = await screen.findByRole("navigation", { name: "Primary" });

    expect(within(primaryNav).getByRole("heading", { name: "Administration" })).toBeInTheDocument();
  });

  test("renders the firm sidebar heading", async () => {
    renderShell("/cycles/queue");

    const primaryNav = await screen.findByRole("navigation", { name: "Primary" });

    expect(within(primaryNav).getByRole("heading", { name: "Firm" })).toBeInTheDocument();
  });

  test("renders the queue view title", async () => {
    renderShell("/cycles/queue");

    expect(
      await screen.findByRole("heading", { name: "Tax Plan Cycle Queue", level: 1 }),
    ).toBeInTheDocument();
  });

  test("shows the authenticated user role", async () => {
    renderShell("/cycles/queue");

    expect(await screen.findByText("Signed in as Advisor")).toBeInTheDocument();
  });

  test("renders the administration view title", async () => {
    renderShell("/administration/tenants-users");

    expect(
      await screen.findByRole("heading", { name: "All Tenants & Users", level: 1 }),
    ).toBeInTheDocument();
  });

  test("defaults view as to firm admin", async () => {
    renderShell("/cycles/queue");

    expect(await screen.findByText("Signed in as Advisor")).toBeInTheDocument();
  });

  test("toggles live calculation off", async () => {
    renderShell("/cycles/queue");

    fireEvent.click(await screen.findByRole("button", { name: /Live calculation/i }));

    expect(screen.getByRole("button", { name: /Live calculation/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("opens the settings dialog", async () => {
    renderShell("/cycles/queue");

    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
  });

  test("renders the sidebar footer session card and logout button", async () => {
    renderShell("/cycles/queue");

    const sessionFooter = await screen.findByLabelText("Session");

    expect(within(sessionFooter).getByText("Jordan Lee")).toBeInTheDocument();
    expect(within(sessionFooter).getByText("Firm Admin")).toBeInTheDocument();
    expect(within(sessionFooter).getByRole("button", { name: "Logout" })).toBeInTheDocument();
  });

  test.each(["Logout", "Sign out"])(
    "%s clears the session and returns to sign-in",
    async (buttonName) => {
      const logout = vi.fn(async () => undefined);
      renderShell("/cycles/queue", true, { logout });

      fireEvent.click(await screen.findByRole("button", { name: buttonName }));

      await vi.waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
      expect(
        await screen.findByRole("heading", { name: "Sign in to your workspace", level: 1 }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeInTheDocument();
    },
  );

  test("renders the dashboard hero on the root route", async () => {
    renderShell("/");

    expect(
      await screen.findByRole("heading", { name: "Tax Liability Tracker" }),
    ).toBeInTheDocument();
  });

  test("still renders placeholder routes that have not been built yet", async () => {
    renderShell("/income");

    expect(await screen.findByRole("heading", { name: "Income" })).toBeInTheDocument();
  });

  test("renders plan tool nav links without search state while routing is disabled", async () => {
    renderShell("/cycles/queue");

    const primaryNav = await screen.findByRole("navigation", { name: "Primary" });

    expect(within(primaryNav).getByRole("link", { name: "Scenario Planner" })).toHaveAttribute(
      "href",
      "/scenarios",
    );
    expect(within(primaryNav).getByRole("link", { name: "Income" })).toHaveAttribute(
      "href",
      "/income",
    );
    expect(within(primaryNav).getByRole("link", { name: "Quarterly Payments" })).toHaveAttribute(
      "href",
      "/quarterly-payments",
    );
    expect(within(primaryNav).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(within(primaryNav).getByRole("link", { name: "Firm Settings" })).toHaveAttribute(
      "href",
      "/firm/settings",
    );
  });
});
