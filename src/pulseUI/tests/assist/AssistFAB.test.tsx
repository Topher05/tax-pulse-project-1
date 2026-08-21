import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test, vi } from "vitest";

import { AssistFAB } from "../../components/assist/AssistFAB.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderFab(anchorElement: HTMLElement | null = null, isOpen = false) {
  return render(<AssistFAB anchorElement={anchorElement} isOpen={isOpen} onOpen={vi.fn()} />);
}

describe("AssistFAB", () => {
  test("keeps the fallback button and tooltip in the same fixed boundary", () => {
    renderFab();

    const button = screen.getByRole("button", { name: "Open RAG assistant" });
    const boundary = button.parentElement as HTMLElement;
    expect(boundary.className).toContain("fallback");
    expect(button.className).not.toContain("fallback");

    fireEvent.mouseEnter(boundary);
    expect(screen.getByRole("tooltip", { name: "Open RAG assistant" })).toBeVisible();
  });

  test("shows and hides the tooltip from the parent hover boundary", () => {
    renderFab();

    const button = screen.getByRole("button", { name: "Open RAG assistant" });
    const boundary = button.parentElement as HTMLElement;
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    fireEvent.mouseEnter(boundary);
    expect(screen.getByRole("tooltip", { name: "Open RAG assistant" })).toBeVisible();

    fireEvent.mouseLeave(boundary);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  test("keeps the tooltip visible while moving between the boundary and FAB", () => {
    renderFab();

    const button = screen.getByRole("button", { name: "Open RAG assistant" });
    const boundary = button.parentElement as HTMLElement;
    fireEvent.mouseEnter(boundary);
    fireEvent.mouseEnter(button);

    expect(screen.getByRole("tooltip", { name: "Open RAG assistant" })).toBeVisible();
  });

  test("shows the tooltip on keyboard focus and opens the assistant on click", () => {
    const onOpen = vi.fn();
    render(<AssistFAB anchorElement={null} isOpen={false} onOpen={onOpen} />);

    const button = screen.getByRole("button", { name: "Open RAG assistant" });
    fireEvent.focus(button);
    expect(screen.getByRole("tooltip", { name: "Open RAG assistant" })).toBeVisible();

    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  test("slides out and disables pointer and keyboard access while the drawer is open", () => {
    const onOpen = vi.fn();
    render(<AssistFAB anchorElement={null} isOpen onOpen={onOpen} />);

    const button = screen.getByRole("button", { name: "Open RAG assistant", hidden: true });
    const boundary = button.parentElement as HTMLElement;
    expect(button).toBeDisabled();
    expect(boundary).toHaveAttribute("aria-hidden", "true");
    expect(boundary).toHaveAttribute("data-state", "drawer-open");

    fireEvent.click(button);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test("uses a Y-axis flip for the open animation", () => {
    const css = readFileSync("components/assist/AssistFAB.module.css", "utf8");

    expect(css).toContain("rotateY(360deg)");
    expect(css).not.toContain("rotateX(360deg)");
  });

  test("renders through the anchored portal before and after open state changes", async () => {
    const anchor = document.createElement("div");
    document.body.append(anchor);
    vi.stubGlobal("IntersectionObserver", class {
      observe() {
        queueMicrotask(() => this.callback([{ isIntersecting: true }]));
      }

      disconnect() {}

      callback: (entries: Array<{ isIntersecting: boolean }>) => void;

      constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
        this.callback = callback;
      }
    });

    const { rerender } = render(<AssistFAB anchorElement={anchor} isOpen={false} onOpen={vi.fn()} />);

    await waitFor(() => {
      expect(anchor.querySelector("button")).toBeInTheDocument();
    });
    const boundary = anchor.querySelector("button")?.parentElement as HTMLElement;
    fireEvent.mouseEnter(boundary);
    expect(anchor.querySelector('[role="tooltip"]')).toBeVisible();

    rerender(<AssistFAB anchorElement={anchor} isOpen onOpen={vi.fn()} />);
    expect(anchor.querySelector("button")).toBeDisabled();
    expect(anchor.querySelector("[data-state='drawer-open']")).toBeInTheDocument();

    rerender(<AssistFAB anchorElement={anchor} isOpen={false} onOpen={vi.fn()} />);
    expect(anchor.querySelector("button")).not.toBeDisabled();
    expect(anchor.querySelector("[data-state='drawer-closed']")).toBeInTheDocument();
  });
});
