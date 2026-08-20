import { useState } from "react";

import {
  BotMessageSquare,
  ChevronDown,
  Copy,
  Paperclip,
  PanelsTopLeft,
  Search,
  Sparkles,
} from "lucide-react";

import { PanelCard } from "../PanelCard.tsx";
import { AssitantLoader } from "./AssitantLoader.tsx";
import type { AssistantCaseContext, AssistantMessage } from "./assistantPanel.tsx";
import styles from "./AssistantDrawer.module.css";

interface AssistantDrawerProps {
  readonly isOpen: boolean;
  readonly isLoading: boolean;
  readonly assistantCaseContext: AssistantCaseContext | null;
  readonly messages: readonly AssistantMessage[];
  readonly errorMessage: string | null;
  onClose: () => void;
}

const toolbarActions = [
  { icon: Sparkles, label: "Enhance" },
  { icon: Search, label: "Search" },
  { icon: Copy, label: "Copy" },
  { icon: Paperclip, label: "Attach" },
  { icon: PanelsTopLeft, label: "Layout" },
] as const;

function formatCaseSummary(context: AssistantCaseContext | null): string {
  if (context === null) {
    return "No plan cycle selected.";
  }

  return `${context.caseId} · ${context.clientName} · ${context.stage}`;
}

export function AssistantDrawer({
  isOpen,
  isLoading,
  assistantCaseContext,
  messages,
  errorMessage,
  onClose,
}: AssistantDrawerProps) {
  const [draft, setDraft] = useState("");
  const summary = formatCaseSummary(assistantCaseContext);

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      <button
        aria-label="Close assistant drawer backdrop"
        className={[
          "absolute inset-0 bg-[rgba(2,6,23,0.55)] transition-opacity duration-5000 ease-out",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        type="button"
        onClick={onClose}
      />

        <aside
          aria-label="RAG assistant"
          aria-modal="true"
          className={[
            styles.drawer,
          "pointer-events-auto absolute right-4 top-4 bottom-4 z-[61] flex max-h-[calc(100vh-2rem)] min-h-[28rem] w-[min(42rem,calc(100vw-2rem))] resize-x flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[color:var(--pulse-surface)] text-[color:var(--pulse-ink)] shadow-[0_28px_72px_rgba(0,0,0,0.42)] backdrop-blur-xl transition-transform duration-[5000ms] ease-out",
          isOpen ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]",
        ].join(" ")}
        role="dialog"
      >
        <header className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(17,24,39,0.9))] px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--pulse-accent-light)]">
                <BotMessageSquare className="h-4 w-4" aria-hidden="true" />
                RAG assistant
              </div>
              <h2 className="mt-2 truncate text-base font-extrabold text-[color:var(--pulse-ink)]">
                {assistantCaseContext?.caseTitle ?? "Plan Cycle Detail"}
              </h2>
              <p className="mt-1 truncate text-xs text-[color:var(--pulse-muted)]">{summary}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close assistant drawer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[color:var(--pulse-ink)] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pulse-accent-light)]"
            >
              <ChevronDown className="h-4 w-4 rotate-90" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-2">
            {toolbarActions.map(({ icon: Icon, label }) => (
              <button
                key={label}
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[color:var(--pulse-ink)] transition-transform hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pulse-accent-light)]"
                aria-label={label}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            ))}
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.18),rgba(2,6,23,0.36))]">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {isLoading ? (
              <AssitantLoader />
            ) : (
              <div className={styles.messageLog} aria-live="polite">
                {errorMessage ? (
                  <PanelCard className={styles.errorCard} title="Assistant request failed">
                    <p className="m-0 text-sm text-[color:var(--pulse-muted)]">{errorMessage}</p>
                  </PanelCard>
                ) : null}

                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={[
                      styles.messageBubble,
                      message.role === "assistant"
                        ? styles.messageAssistant
                        : message.role === "error"
                          ? styles.messageError
                          : styles.messageUser,
                    ].join(" ")}
                  >
                    <p className={styles.messageTitle}>{message.title}</p>
                    <p className={styles.messageBody}>{message.body}</p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <footer className="border-t border-white/10 bg-[rgba(15,23,42,0.92)] px-4 py-4">
            <div className="rounded-[24px] border border-white/10 bg-[rgba(15,23,42,0.92)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <label className="block">
                <span className="sr-only">Assistant prompt</span>
                <textarea
                  className={[
                    styles.composerInput,
                    "min-h-24 w-full resize-none rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-[color:var(--pulse-ink)] placeholder:text-[color:var(--pulse-muted)] focus:border-[color:var(--pulse-accent)] focus:outline-none",
                  ].join(" ")}
                  placeholder="Ask a follow-up, refine the recommendation, or request a citation..."
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                  }}
                />
              </label>

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="m-0 text-xs text-[color:var(--pulse-muted)]">
                  Action buttons will be defined in a later ticket.
                </p>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[color:var(--pulse-accent)] px-4 text-sm font-bold text-white opacity-70"
                  disabled
                >
                  Send
                </button>
              </div>
            </div>
          </footer>
        </div>
      </aside>
    </div>
  );
}
