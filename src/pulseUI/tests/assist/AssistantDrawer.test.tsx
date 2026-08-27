import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test, vi } from "vitest";

import { NotificationToastProvider } from "../../components/NotificationToast.tsx";
import { AssistantDrawer } from "../../components/assist/AssistantDrawer.tsx";

afterEach(() => {
  cleanup();
});

const context = {
  caseId: "case-001",
  caseTitle: "case-001 - Q2 2026 Tax Plan",
  clientName: "Client 001",
  recommendation: "Convert $40k traditional to Roth",
  stage: "Archived",
  advisor: "Advisor 001",
  dueDate: "Jun 30, 2026",
};

function renderDrawer(overrides: Partial<React.ComponentProps<typeof AssistantDrawer>> = {}) {
  return render(
    <NotificationToastProvider>
      <AssistantDrawer
        assistantCaseContext={context}
        errorMessage={null}
        isLoading={false}
        isOpen
        messages={[]}
        onClose={vi.fn()}
        onSendMessage={vi.fn(async () => undefined)}
        onStartNewDialogue={vi.fn()}
        {...overrides}
      />
    </NotificationToastProvider>,
  );
}

describe("AssistantDrawer", () => {
  test("renders four toolbar controls with accessible tooltips", () => {
    renderDrawer();

    const toolbar = screen.getByRole("group", { name: "Assistant controls" });
    expect(within(toolbar).getAllByRole("button")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Expand to fullscreen" })).toBeInTheDocument();
    expect(screen.getByRole("tooltip", { name: "Start new dialogue" })).toBeInTheDocument();
    expect(screen.getByText("case-001 - Q2 2026 Tax Plan")).toBeInTheDocument();
    expect(screen.getByText("Advisor 001 | Jun 30, 2026 | Archived")).toBeInTheDocument();
  });

  test("dismisses toolbar tooltips after activation and restores them on new hover", () => {
    renderDrawer();

    const button = screen.getByRole("button", { name: "Start new dialogue" });
    const tooltip = screen.getByRole("tooltip", { name: "Start new dialogue" });

    fireEvent.mouseEnter(button);
    expect(tooltip).toHaveAttribute("data-visible", "true");

    fireEvent.click(button);
    fireEvent.mouseLeave(button);
    expect(tooltip).toHaveAttribute("data-visible", "false");

    fireEvent.mouseEnter(button);
    expect(tooltip).toHaveAttribute("data-visible", "true");
  });

  test("toggles fullscreen and shows the prompt suggestion toast", () => {
    renderDrawer();

    const drawer = screen.getByRole("dialog", { name: "case-001 - Q2 2026 Tax Plan" });
    fireEvent.click(screen.getByRole("button", { name: "Expand to fullscreen" }));
    expect(drawer.className).toContain("fullscreen");
    expect(screen.getByRole("button", { name: "Collapse to drawer" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open prompt suggestions" }));
    expect(screen.getByText("Recommended Prompts")).toBeInTheDocument();
  });

  test("resets fullscreen mode when the drawer closes", () => {
    const { rerender } = renderDrawer();

    const drawer = screen.getByRole("dialog", { name: "case-001 - Q2 2026 Tax Plan" });
    fireEvent.click(screen.getByRole("button", { name: "Expand to fullscreen" }));
    expect(drawer.className).toContain("fullscreen");

    rerender(
      <NotificationToastProvider>
        <AssistantDrawer
          assistantCaseContext={context}
          errorMessage={null}
          isLoading={false}
          isOpen={false}
          messages={[]}
          onClose={vi.fn()}
          onSendMessage={vi.fn(async () => undefined)}
          onStartNewDialogue={vi.fn()}
        />
      </NotificationToastProvider>,
    );

    rerender(
      <NotificationToastProvider>
        <AssistantDrawer
          assistantCaseContext={context}
          errorMessage={null}
          isLoading={false}
          isOpen
          messages={[]}
          onClose={vi.fn()}
          onSendMessage={vi.fn(async () => undefined)}
          onStartNewDialogue={vi.fn()}
        />
      </NotificationToastProvider>,
    );

    expect(screen.getByRole("dialog", { name: "case-001 - Q2 2026 Tax Plan" }).className).not.toContain(
      "fullscreen",
    );
  });

  test("traps focus in the open drawer and closes on Escape", () => {
    const onClose = vi.fn();
    renderDrawer({ onClose });

    const drawer = screen.getByRole("dialog", { name: "case-001 - Q2 2026 Tax Plan" });
    fireEvent.keyDown(drawer, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Expand to fullscreen" })).toHaveFocus();

    fireEvent.keyDown(drawer, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("textbox", { name: "Assistant prompt" })).toHaveFocus();

    fireEvent.keyDown(drawer, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  test("submits a draft when Enter is pressed", async () => {
    const onSendMessage = vi.fn(async () => undefined);
    renderDrawer({ onSendMessage });

    const input = screen.getByRole("textbox", { name: "Assistant prompt" });
    fireEvent.change(input, { target: { value: "Explain this recommendation" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await vi.waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith("Explain this recommendation");
    });
  });

  test("preserves newline behavior for Shift+Enter and blocks empty sends", () => {
    const onSendMessage = vi.fn(async () => undefined);
    renderDrawer({ onSendMessage });

    const input = screen.getByRole("textbox", { name: "Assistant prompt" });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "Line one" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  test("shows the loader while the request is pending", () => {
    renderDrawer({ isLoading: true });

    expect(screen.getByRole("status", { name: "Loading assistant" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Assistant prompt" })).not.toBeInTheDocument();
  });

  test("renders error and message log states", () => {
    renderDrawer({
      errorMessage: "Assistant unavailable.",
      messages: [
        { id: "message-1", role: "user", title: "Advisor prompt", body: "Explain this." },
        {
          id: "message-2",
          role: "assistant",
          title: "Assistant response",
          body: "Assistant explanation.",
          citations: [
            {
              chunk_id: "chunk-1",
              document_id: "doc-1",
              document_title: "Synthetic Estimated Payment Rules",
              document_type: "tax_code",
              fictional_issuer: "Training Revenue Authority",
              section_id: "SYN-TC-4100-b",
              section_path: "Tax Code > Estimated Payments > Thresholds",
              synthetic_notice: "Synthetic training content; rates and limits are invented.",
            },
          ],
        },
      ],
    });

    expect(screen.getByRole("log")).toBeInTheDocument();
    expect(screen.getByText("Assistant request failed")).toBeInTheDocument();
    expect(screen.getByText("Advisor prompt")).toBeInTheDocument();
    expect(screen.getByText("Assistant explanation.")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Assistant citations" })).toBeInTheDocument();
    expect(screen.getByText("Synthetic Estimated Payment Rules | SYN-TC-4100-b")).toBeInTheDocument();
  });

  test("keeps drawer interactions from closing through the backdrop", () => {
    const onClose = vi.fn();
    renderDrawer({ onClose });

    fireEvent.click(screen.getByRole("button", { name: "Expand to fullscreen" }));
    fireEvent.click(screen.getByRole("button", { name: "Start new dialogue" }));
    fireEvent.click(screen.getByRole("textbox", { name: "Assistant prompt" }));

    const input = screen.getByRole("textbox", { name: "Assistant prompt" });
    fireEvent.change(input, { target: { value: "What changed?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(onClose).not.toHaveBeenCalled();
  });

  test("closes once when the backdrop is clicked", () => {
    const onClose = vi.fn();
    renderDrawer({ onClose });

    fireEvent.click(screen.getByRole("presentation", { hidden: true }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  test("keeps the send control anchored to the bottom-right in component CSS", () => {
    const css = readFileSync("components/assist/AssistantDrawer.module.css", "utf8");

    expect(css).toContain(".sendAction");
    expect(css).toContain("position: absolute");
    expect(css).toContain("right: 0.75rem");
    expect(css).toContain("bottom: 0.75rem");
  });
});
