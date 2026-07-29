import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseRouter } from "../../app/createPulseRouter.ts";
import { AuthenticatedSessionProvider } from "../auth/AuthenticatedSessionProvider.tsx";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

describe("Tax Plan Cycle details page", () => {
  test("renders the plan cycle overview", async () => {
    render(
      <AuthenticatedSessionProvider>
        <RouterProvider router={createPulseRouter(["/cycles/TP-24018"])} />
      </AuthenticatedSessionProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Cycle Details", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByText("2026 Q4")).toBeInTheDocument();
    expect(screen.getByText("$18,400")).toBeInTheDocument();
  });
});
