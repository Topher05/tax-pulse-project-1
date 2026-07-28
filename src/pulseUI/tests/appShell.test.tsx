import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseRouter } from "../app/createPulseRouter.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

const renderShell = (initialPath: string = "/") => {
  render(<RouterProvider router={createPulseRouter([initialPath])} />);
};

describe("Pulse UI app shell", () => {
  test("renders the wireframe sidebar groups", async () => {
    renderShell();

    const primaryNav = await screen.findByRole("navigation", { name: "Primary" });

    expect(within(primaryNav).getByRole("heading", { name: "Workspace" })).toBeInTheDocument();
    expect(within(primaryNav).getByRole("heading", { name: "Plan Tools" })).toBeInTheDocument();
    expect(within(primaryNav).getByRole("heading", { name: "Firm" })).toBeInTheDocument();
  });

  test("shows the active view title and design-only View-as switcher", async () => {
    renderShell("/plan-cycles");

    expect(await screen.findByRole("heading", { name: "Plan Cycle Queue" })).toBeInTheDocument();
    expect(screen.getByText("View as")).toBeInTheDocument();

    const advisorButton = screen.getByRole("button", { name: "Advisor" });
    const adminButton = screen.getByRole("button", { name: "Firm Admin" });
    const clientButton = screen.getByRole("button", { name: "Client" });

    expect(advisorButton).toHaveAttribute("aria-pressed", "true");
    expect(adminButton).toHaveAttribute("aria-pressed", "false");
    expect(clientButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(adminButton);

    expect(advisorButton).toHaveAttribute("aria-pressed", "false");
    expect(adminButton).toHaveAttribute("aria-pressed", "true");
    expect(clientButton).toHaveAttribute("aria-pressed", "false");
  });

  test("renders an empty region for routed view content", async () => {
    renderShell("/income");

    expect(await screen.findByRole("heading", { name: "Income" })).toBeInTheDocument();

    const contentRegion = screen.getByRole("main", { name: "Routed view content" });

    expect(contentRegion).toBeEmptyDOMElement();
  });
});
