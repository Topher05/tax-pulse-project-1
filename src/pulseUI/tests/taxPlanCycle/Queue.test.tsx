import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseRouter } from "../../app/createPulseRouter.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

const renderQueue = () => {
  render(<RouterProvider router={createPulseRouter(["/cycles/queue"])} />);
};

describe("Tax Plan Cycle queue page", () => {
  test("renders the Open Cycles KPI", async () => {
    renderQueue();

    expect(await screen.findByText("Open Cycles")).toBeInTheDocument();
  });

  test("renders the tax plan cycle cases table heading", async () => {
    renderQueue();

    expect(
      await screen.findByRole("heading", { name: "Tax Plan Cycle Cases" }),
    ).toBeInTheDocument();
  });

  test("renders five open action buttons", async () => {
    renderQueue();

    const table = await screen.findByRole("table", { name: "Tax Plan Cycle Cases" });

    expect(within(table).getAllByRole("button", { name: "Open" })).toHaveLength(5);
  });

  test("renders the expected number of visible table rows", async () => {
    renderQueue();

    const table = await screen.findByRole("table", { name: "Tax Plan Cycle Cases" });

    expect(within(table).getAllByRole("row")).toHaveLength(6);
  });

  test("routes the open button to the details placeholder", async () => {
    renderQueue();

    const table = await screen.findByRole("table", { name: "Tax Plan Cycle Cases" });
    fireEvent.click(within(table).getAllByRole("button", { name: "Open" })[0]!);

    expect(await screen.findByText(`hello Details page ${String.fromCodePoint(0x1f680)}`)).toBeInTheDocument();
  });
});
