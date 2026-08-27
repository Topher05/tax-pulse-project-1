import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import {
  BotMessageSquare,
  Orbit,
  PanelLeftClose,
  PanelRightClose,
  Plus,
  Send,
  StickyNote,
  X,
} from "lucide-react";

import { useNotificationToast } from "../NotificationToast.tsx";
import { PanelCard } from "../PanelCard.tsx";
import { createInfoNotificationMessage } from "../../entities/notificationMessage.ts";
import { AssitantLoader } from "./AssitantLoader.tsx";
import type { AssistantCaseContext, AssistantMessage } from "./assistantPanel.tsx";
import { Tooltip } from "./Tooltips.tsx";
import styles from "./AssistantDrawer.module.css";

interface AssistantDrawerProps {
  readonly isOpen: boolean;
  readonly isLoading: boolean;
  readonly assistantCaseContext: AssistantCaseContext | null;
  readonly messages: readonly AssistantMessage[];
  readonly errorMessage: string | null;
  onClose: () => void;
  onSendMessage(message: string): Promise<void>;
  onStartNewDialogue(): void;
}

function formatCaseSummary(context: AssistantCaseContext | null): string {
  if (context === null) {
    return "No plan cycle selected.";
  }

  return [context.advisor, context.dueDate, context.stage].join(" | ");
}

function StickyNotePlusIcon() {
  return (
    <span className={styles.compositeIcon} aria-hidden="true">
      <StickyNote />
      <Plus />
    </span>
  );
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      [
        "button:not([disabled])",
        "textarea:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "a[href]",
        "[tabindex]:not([tabindex='-1'])",
      ].join(","),
    ),
  ).filter((element) => element.getAttribute("aria-hidden") !== "true" && !element.hasAttribute("disabled"));
}

export function AssistantDrawer({
  isOpen,
  isLoading,
  assistantCaseContext,
  messages,
  errorMessage,
  onClose,
  onSendMessage,
  onStartNewDialogue,
}: AssistantDrawerProps) {
  const [draft, setDraft] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { showNotification } = useNotificationToast();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const dialogTitleId = useId();
  const dialogSummaryId = useId();
  const summary = formatCaseSummary(assistantCaseContext);

  useEffect(() => {
    if (isOpen) {
      const frame = window.requestAnimationFrame(() => {
        dialogRef.current?.focus();
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    setIsFullscreen(false);
    return undefined;
  }, [isOpen]);

  const submitDraft = async () => {
    const trimmedDraft = draft.trim();
    if (trimmedDraft.length === 0 || isLoading) {
      return;
    }

    setDraft("");
    await onSendMessage(trimmedDraft);
  };

  const handleNewDialogue = () => {
    setDraft("");
    onStartNewDialogue();
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!isOpen) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }

    const focusableElements = getFocusableElements(dialog);
    if (focusableElements.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey) {
      if (activeElement === dialog || activeElement === firstFocusable || !dialog.contains(activeElement)) {
        event.preventDefault();
        lastFocusable?.focus();
      }

      return;
    }

    if (activeElement === dialog || activeElement === lastFocusable || !dialog.contains(activeElement)) {
      event.preventDefault();
      firstFocusable?.focus();
    }
  };

  const toolbarActions: readonly {
    key: string;
    label: string;
    icon: ReactNode;
    onClick: () => void;
  }[] = [
    {
      key: "pane-size",
      label: isFullscreen ? "Collapse to drawer" : "Expand to fullscreen",
      icon: isFullscreen ? <PanelRightClose aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />,
      onClick: () => {
        setIsFullscreen((current) => !current);
      },
    },
    {
      key: "new-dialogue",
      label: "Start new dialogue",
      icon: <StickyNotePlusIcon />,
      onClick: handleNewDialogue,
    },
    {
      key: "prompt-suggestions",
      label: "Open prompt suggestions",
      icon: <Orbit aria-hidden="true" />,
      onClick: () => {
        showNotification(
          createInfoNotificationMessage(
            "Prompt suggestions will be added in a future ticket.",
            "Recommended Prompts",
          ),
        );
      },
    },
    {
      key: "close-assistant",
      label: "Close Assistant",
      icon: <X aria-hidden="true" />,
      onClick: onClose,
    },
  ];

  return (
    <div className={styles.overlay} data-state={isOpen ? "open" : "closed"}>
      <div aria-hidden="true" className={styles.backdrop} onClick={onClose} role="presentation" />

      <div
        aria-describedby={dialogSummaryId}
        aria-labelledby={dialogTitleId}
        aria-modal="true"
        aria-hidden={!isOpen}
        className={[styles.drawer, isFullscreen ? styles.fullscreen : ""].join(" ")}
        data-state={isOpen ? "open" : "closed"}
        inert={!isOpen ? true : undefined}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
      >
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <BotMessageSquare aria-hidden="true" />
            <h2 id={dialogTitleId}>{assistantCaseContext?.caseTitle ?? "Plan Cycle Detail"}</h2>
          </div>
          <p id={dialogSummaryId} className={styles.summary}>
            {summary}
          </p>

          <div className={styles.toolbar} aria-label="Assistant controls" role="group">
            {toolbarActions.map((action) => (
              <Tooltip key={action.key} content={action.label} placement="bottom">
                <button
                  type="button"
                  aria-label={action.label}
                  className={styles.toolbarButton}
                  onClick={action.onClick}
                >
                  {action.icon}
                </button>
              </Tooltip>
            ))}
          </div>
        </header>

        <div className={styles.main} aria-busy={isLoading}>
          <div className={styles.messageViewport}>
            {isLoading ? (
              <AssitantLoader />
            ) : (
              <div className={styles.messageLog} aria-live="polite" role="log">
                {errorMessage ? (
                  <PanelCard className={styles.errorCard} title="Assistant request failed">
                    <p className={styles.errorMessage}>{errorMessage}</p>
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
                    {message.role === "assistant" && message.citations && message.citations.length > 0 ? (
                      <ul className={styles.citationList} aria-label="Assistant citations">
                        {message.citations.map((citation) => (
                          <li key={`${message.id}-${citation.chunk_id}`} className={styles.citationItem}>
                            <p className={styles.citationTitle}>
                              {citation.document_title} | {citation.section_id}
                            </p>
                            <p className={styles.citationMeta}>{citation.section_path}</p>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>

          <footer className={styles.footer}>
            {isLoading ? (
              <AssitantLoader variant="composer" />
            ) : (
              <form
                className={styles.composer}
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitDraft();
                }}
              >
                <div className={styles.composerField}>
                  <div className={styles.composerEditor}>
                    <textarea
                      aria-label="Assistant prompt"
                      className={styles.composerInput}
                      placeholder="Ask a follow-up, refine the recommendation, or request a citation..."
                      value={draft}
                      onChange={(event) => {
                        setDraft(event.target.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void submitDraft();
                        }
                      }}
                    />
                    <div className={styles.sendAction}>
                      <button
                        type="submit"
                        aria-label="Send message"
                        className={styles.sendButton}
                        disabled={draft.trim().length === 0}
                      >
                        <Send aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
                <p className={styles.disclaimer}>
                  TaxPulse RAG Assistant can make mistakes. Issues will be addressed in future tickets
                </p>
              </form>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
