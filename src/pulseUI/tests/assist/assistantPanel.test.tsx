import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CaseApiError } from "../../shared/caseApi.ts";
import {
  AssistantPanelProvider,
  type AssistantCaseContext,
  useAssistantPanel,
} from "../../components/assist/assistantPanel.tsx";

const mutationMocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("../../entities/taxPlanDetailsAssistant.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../entities/taxPlanDetailsAssistant.ts")>();

  return {
    ...actual,
    useTaxPlanDetailsAssistantMutation: () => ({
      isPending: false,
      mutateAsync: mutationMocks.mutateAsync,
      reset: mutationMocks.reset,
    }),
  };
});

const assistantContext: AssistantCaseContext = {
  caseId: "case-001",
  caseTitle: "case-001 - Q2 2026 Tax Plan",
  clientName: "Example Client",
  recommendation:
    "Tax Plan Cycle in Review case owned by Maya Reed with a High priority for the taxpayer Example Client from tivs",
  stage: "Review",
  advisor: "Maya Reed",
  dueDate: "Jun 30, 2026",
};

function AssistantPanelHarness() {
  const panel = useAssistantPanel();

  useEffect(() => {
    panel.setAssistantCaseContext(assistantContext);

    return () => {
      panel.setAssistantCaseContext(null);
    };
  }, [panel.setAssistantCaseContext]);

  return (
    <div>
      <button type="button" onClick={() => void panel.openAssistant()}>
        Open
      </button>
      <button type="button" onClick={() => void panel.sendMessage("  What changed?  ")}>
        Send valid
      </button>
      <button type="button" onClick={() => void panel.sendMessage("Unsafe\u0000question")}>
        Send invalid
      </button>
      <span>{panel.isDrawerOpen ? "Drawer open" : "Drawer closed"}</span>
      {panel.messages.map((message) => (
        <article key={message.id}>
          <h2>{message.title}</h2>
          <p>{message.body}</p>
          {message.citations?.map((citation) => (
            <span key={citation.chunk_id}>{citation.document_title}</span>
          ))}
        </article>
      ))}
    </div>
  );
}

function renderPanel() {
  return render(
    <AssistantPanelProvider>
      <AssistantPanelHarness />
    </AssistantPanelProvider>,
  );
}

describe("AssistantPanelProvider", () => {
  beforeEach(() => {
    mutationMocks.mutateAsync.mockReset();
    mutationMocks.reset.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  test("opens with a recommendation-only request and an assistant-only transcript", async () => {
    mutationMocks.mutateAsync.mockResolvedValueOnce({
      explanation: "Grounded initial explanation.",
      citations: [
        {
          chunk_id: "chunk-1",
          document_id: "doc-1",
          document_title: "Synthetic Tax Code",
          document_type: "tax_code",
          fictional_issuer: "Training Revenue Authority",
          section_id: "SYN-1",
          section_path: "Tax Code > Synthetic",
          synthetic_notice: "Synthetic training content.",
        },
      ],
    });
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    await waitFor(() => {
      expect(mutationMocks.mutateAsync).toHaveBeenCalledWith({
        caseId: "case-001",
        request: {
          recommendation_context: {
            recommendation: assistantContext.recommendation,
          },
        },
      });
    });
    expect(await screen.findByText("Grounded initial explanation.")).toBeInTheDocument();
    expect(screen.getByText("Synthetic Tax Code")).toBeInTheDocument();
    expect(screen.queryByText("Advisor prompt")).not.toBeInTheDocument();
    expect(screen.getByText("Drawer open")).toBeInTheDocument();
  });

  test("sends a trimmed follow-up with the same recommendation", async () => {
    mutationMocks.mutateAsync.mockResolvedValueOnce({ explanation: "Follow-up response.", citations: [] });
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Send valid" }));

    await waitFor(() => {
      expect(mutationMocks.mutateAsync).toHaveBeenCalledWith({
        caseId: "case-001",
        request: {
          recommendation_context: {
            recommendation: assistantContext.recommendation,
            question: "What changed?",
          },
        },
      });
    });
    expect(screen.getByText("What changed?")).toBeInTheDocument();
    expect(await screen.findByText("Follow-up response.")).toBeInTheDocument();
  });

  test("rejects invalid questions before invoking the mutation", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Send invalid" }));

    expect(mutationMocks.mutateAsync).not.toHaveBeenCalled();
    expect(screen.queryByText("Advisor prompt")).not.toBeInTheDocument();
  });

  test("renders one structured error message", async () => {
    mutationMocks.mutateAsync.mockRejectedValueOnce(
      new CaseApiError(
        422,
        JSON.stringify({ title: "Unsupported context", detail: "No grounded content matched." }),
      ),
    );
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(await screen.findByText("Unsupported context")).toBeInTheDocument();
    expect(screen.getAllByText("No grounded content matched.")).toHaveLength(1);
  });
});
