import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../app/queryClient.ts";
import { createPulseRouter } from "../app/createPulseRouter.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

const renderShell = (initialPath: string = "/") => {
  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <RouterProvider router={createPulseRouter([initialPath])} />
    </QueryClientProvider>,
  );
};

describe("Pulse UI app shell", () => {
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

  test("defaults view as to firm admin", async () => {
    renderShell("/cycles/queue");

    expect(await screen.findByRole("combobox", { name: "View as" })).toHaveValue("Firm Admin");
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
});
