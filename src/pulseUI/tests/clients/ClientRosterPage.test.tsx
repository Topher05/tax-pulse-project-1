import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import { AuthenticatedSessionProvider } from "../auth/AuthenticatedSessionProvider.tsx";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  localStorage.clear();
  cleanup();
});

describe("ClientRosterPage", () => {
  test("renders the scaffolded client roster from the prototype", async () => {
    render(
      <AuthenticatedSessionProvider>
        <QueryClientProvider client={createPulseQueryClient()}>
          <RouterProvider router={createPulseRouter(["/clients"])} />
        </QueryClientProvider>
      </AuthenticatedSessionProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Client Roster", level: 1 }))
      .toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Client Roster" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Client Roster", level: 2 })).toBeInTheDocument();
    expect(
      screen.getByText("Switch into a client's books with read-only access; build scenarios for them."),
    ).toBeInTheDocument();

    expect(screen.getByRole("table", { name: "Client roster" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Client" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Filing" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "YTD Income" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Est. Tax" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Quarterly" })).toBeInTheDocument();

    expect(screen.getByText("Avery Chen")).toBeInTheDocument();
    expect(screen.getAllByText("Single - 1099")).toHaveLength(2);
    expect(screen.getByText("$108,500")).toBeInTheDocument();
    expect(screen.getByText("$32,100")).toBeInTheDocument();
    expect(screen.getAllByText("Q2 due Jun 15")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Open Books" })).toHaveLength(4);
    expect(screen.getAllByRole("button", { name: "Open Books" })[0]).toBeDisabled();
  });
});
