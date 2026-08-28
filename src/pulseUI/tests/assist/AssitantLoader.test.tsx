import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";

import { AssitantLoader } from "../../components/assist/AssitantLoader.tsx";

afterEach(() => {
  cleanup();
});

describe("AssitantLoader", () => {
  test("announces the main assistant loading state once", () => {
    const { container } = render(<AssitantLoader />);

    const status = screen.getByRole("status", { name: "Loading assistant" });
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Preparing the assistant workspace")).toBeInTheDocument();
    expect(screen.getByText("Loading citations, response scaffolding, and the case context.")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-loader-toolbar-button]")).toHaveLength(3);
    expect(screen.getByText("Preparing the assistant workspace").closest("[aria-hidden='true']")).toBeInTheDocument();

    const css = readFileSync("components/assist/AssitantLoader.module.css", "utf8");
    expect(css).toContain("justify-content: flex-end");
    expect(css).toContain("flex: 0 0 2.75rem");
    expect(css).toContain("min-height: clamp(7rem, 30dvh, 12rem)");
    expect(css).toContain("@media (max-height: 560px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  test("renders the composer skeleton without creating another live status", () => {
    const { container } = render(<AssitantLoader variant="composer" />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();

    const css = readFileSync("components/assist/AssitantLoader.module.css", "utf8");
    expect(css).toContain("width: 2.75rem");
    expect(css).toContain("height: 2.75rem");
    expect(css).toContain("border-radius: 20px");
  });
});
