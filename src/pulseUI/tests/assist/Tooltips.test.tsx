import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { Tooltip } from "../../components/assist/Tooltips.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Tooltip", () => {
  test("connects the tooltip to its control and shows it on hover", () => {
    render(
      <Tooltip content="Close Assistant" placement="bottom">
        <button type="button">Close</button>
      </Tooltip>,
    );

    const button = screen.getByRole("button", { name: "Close" });
    const tooltip = screen.getByRole("tooltip", { name: "Close Assistant" });

    expect(button).toHaveAttribute("aria-describedby", tooltip.id);
    expect(tooltip).toHaveAttribute("data-visible", "false");

    fireEvent.mouseEnter(button);
    expect(tooltip).toHaveAttribute("data-visible", "true");

    fireEvent.mouseLeave(button);
    expect(tooltip).toHaveAttribute("data-visible", "false");
  });

  test("does not persist after pointer activation once hover leaves", () => {
    const onClick = vi.fn();
    render(
      <Tooltip content="Start new dialogue">
        <button type="button" onClick={onClick}>
          New
        </button>
      </Tooltip>,
    );

    const button = screen.getByRole("button", { name: "New" });
    const tooltip = screen.getByRole("tooltip", { name: "Start new dialogue" });

    fireEvent.mouseEnter(button);
    fireEvent.click(button);
    fireEvent.mouseLeave(button);

    expect(onClick).toHaveBeenCalledOnce();
    expect(tooltip).toHaveAttribute("data-visible", "false");
  });

  test("preserves keyboard focus visibility", () => {
    render(
      <Tooltip content="Close Assistant">
        <button type="button">Close</button>
      </Tooltip>,
    );

    const button = screen.getByRole("button", { name: "Close" });
    const tooltip = screen.getByRole("tooltip", { name: "Close Assistant" });

    fireEvent.focus(button);
    expect(tooltip).toHaveAttribute("data-visible", "true");

    fireEvent.blur(button);
    expect(tooltip).toHaveAttribute("data-visible", "false");
  });
});
