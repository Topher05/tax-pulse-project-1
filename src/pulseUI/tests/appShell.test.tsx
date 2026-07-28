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
    renderShell("/cycles/queue");

    const primaryNav = await screen.findByRole("navigation", { name: "Primary" });

    expect(within(primaryNav).getByRole("heading", { name: "Workspace" })).toBeInTheDocument();
    expect(within(primaryNav).getByRole("heading", { name: "Plan Tools" })).toBeInTheDocument();
    expect(within(primaryNav).getByRole("heading", { name: "Firm" })).toBeInTheDocument();
    expect(within(primaryNav).getByRole("link", { name: "Tax Plan Cycle Queue" })).toBeInTheDocument();
  });

  test("shows the queue view title and menubar controls", async () => {
    renderShell("/cycles/queue");

    expect(
      await screen.findByRole("heading", { name: "Tax Plan Cycle Queue", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("View as")).toBeInTheDocument();

    const roleSelect = screen.getByRole("combobox", { name: "View as" });

    expect(roleSelect).toHaveValue("Firm Admin");
    expect(within(roleSelect).getByRole("option", { name: "Advisor" })).toBeInTheDocument();
    expect(within(roleSelect).getByRole("option", { name: "Client" })).toBeInTheDocument();
    expect(within(roleSelect).getByRole("option", { name: "Platform Admin" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Live calculation/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: /Live calculation/i }));

    expect(screen.getByRole("button", { name: /Live calculation/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
  });

  test("renders an empty region for routed view content", async () => {
    renderShell("/income");

    expect(await screen.findByRole("heading", { name: "Income" })).toBeInTheDocument();

    const contentRegion = screen.getByRole("main", { name: "Routed view content" });

    expect(contentRegion).toBeEmptyDOMElement();
  });
});
