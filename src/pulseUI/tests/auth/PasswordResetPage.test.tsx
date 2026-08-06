import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";

import { createPulseRouter } from "../../app/createPulseRouter.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(cleanup);

test("shows the mocked reset confirmation without making a network request", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  render(<RouterProvider router={createPulseRouter(["/password-reset"])} />);

  fireEvent.change(await screen.findByRole("textbox", { name: "Email address" }), {
    target: { value: "advisor@example.test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  expect(await screen.findByRole("heading", { name: "Check your email" })).toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});
