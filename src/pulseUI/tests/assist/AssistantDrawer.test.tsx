import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
    expect(screen.getByText("Advisor 001 · Jun 30, 2026 · Archived")).toBeInTheDocument();
  });

  test("toggles fullscreen and shows the prompt suggestion toast", () => {
    renderDrawer();

    const drawer = screen.getByRole("dialog", { name: "RAG assistant" });
    fireEvent.click(screen.getByRole("button", { name: "Expand to fullscreen" }));
    expect(drawer.className).toContain("fullscreen");
    expect(screen.getByRole("button", { name: "Collapse to drawer" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open prompt suggestions" }));
    expect(screen.getByText("Recommended Prompts")).toBeInTheDocument();
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

  test("shows the loader while the request is pending", () => {
    renderDrawer({ isLoading: true });

    expect(screen.getByRole("status", { name: "Loading assistant" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Assistant prompt" })).not.toBeInTheDocument();
  });
});
