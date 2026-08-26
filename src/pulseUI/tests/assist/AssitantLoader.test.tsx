import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { AssitantLoader } from "../../components/assist/AssitantLoader.tsx";

afterEach(() => {
  cleanup();
});

describe("AssitantLoader", () => {
  test("announces the main assistant loading state once", () => {
    render(<AssitantLoader />);

    expect(screen.getByRole("status", { name: "Loading assistant" })).toBeInTheDocument();
    expect(screen.getByText("Preparing the assistant workspace")).toBeInTheDocument();
    expect(screen.getByText("Loading citations, response scaffolding, and the case context.")).toBeInTheDocument();
  });

  test("renders the composer skeleton without creating another live status", () => {
    const { container } = render(<AssitantLoader variant="composer" />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });
});
