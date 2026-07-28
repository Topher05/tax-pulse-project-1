import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseRouter } from "../../app/createPulseRouter.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

describe("Tax Plan Cycle details page", () => {
  test("renders the blank details placeholder", async () => {
    render(<RouterProvider router={createPulseRouter(["/cycles/TP-24018"])} />);

    expect(await screen.findByText("hello Details page 🚀")).toBeInTheDocument();
  });
});
