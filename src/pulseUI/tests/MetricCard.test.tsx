import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { MetricCard } from "../components/MetricCard.tsx";

afterEach(() => {
  cleanup();
});

describe("MetricCard", () => {
  test("renders the metric label, value, and caption", () => {
    render(
      <MetricCard
        label="Open Cycles"
        value="14"
        caption="3 due this week"
        tone="green"
      />,
    );

    expect(screen.getByText("Open Cycles")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("3 due this week")).toBeInTheDocument();
  });
});
