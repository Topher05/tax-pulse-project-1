import { useState } from "react";
import type { ReactNode } from "react";
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
import {
  createInfoNotificationMessage,
} from "../../entities/notificationMessage.ts";
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

  return `${context.advisor} · ${context.dueDate} · ${context.stage}`;
}

function StickyNotePlusIcon() {
  return (
    <span className={styles.compositeIcon} aria-hidden="true">
      <StickyNote />
      <Plus />
    </span>
  );
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
  const summary = formatCaseSummary(assistantCaseContext);

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
      <button
        aria-label="Close assistant drawer backdrop"
        aria-hidden={!isOpen}
        className={styles.backdrop}
        type="button"
        onClick={onClose}
      />

      <aside
        aria-label="RAG assistant"
        aria-hidden={!isOpen}
        aria-modal="true"
        className={[styles.drawer, isFullscreen ? styles.fullscreen : ""].join(" ")}
        data-state={isOpen ? "open" : "closed"}
        role="dialog"
      >
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <BotMessageSquare aria-hidden="true" />
            <h2>{assistantCaseContext?.caseTitle ?? "Plan Cycle Detail"}</h2>
          </div>
          <p className={styles.summary}>{summary}</p>

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
              <div className={styles.messageLog} aria-live="polite">
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
                <label className={styles.inputLabel}>
                  <span className="sr-only">Assistant prompt</span>
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
                  <Tooltip content="Send message" placement="top">
                    <button
                      type="submit"
                      aria-label="Send message"
                      className={styles.sendButton}
                      disabled={draft.trim().length === 0}
                    >
                      <Send aria-hidden="true" />
                    </button>
                  </Tooltip>
                </label>
                <p className={styles.disclaimer}>
                  TaxPulse RAG Assistant can make mistakes. Issues will be addressed in future tickets
                </p>
              </form>
            )}
          </footer>
        </div>
      </aside>
    </div>
  );
}
