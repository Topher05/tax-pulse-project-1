import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";

import {
  parseTaxPlanDetailsAssistantErrorMessage,
  useTaxPlanDetailsAssistantMutation,
} from "../../entities/taxPlanDetailsAssistant.ts";

export interface AssistantCaseContext {
  caseId: string;
  caseTitle: string;
  clientName: string;
  recommendation: string;
  stage: string;
  advisor: string;
  dueDate: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant" | "error";
  title: string;
  body: string;
}

export interface AssistantPanelContextValue {
  assistantCaseContext: AssistantCaseContext | null;
  messages: readonly AssistantMessage[];
  errorMessage: string | null;
  isDrawerOpen: boolean;
  isLoading: boolean;
  fabAnchorElement: HTMLElement | null;
  setAssistantCaseContext(context: AssistantCaseContext | null): void;
  registerFabAnchor(element: HTMLElement | null): void;
  openAssistant(): Promise<void>;
  sendMessage(message: string): Promise<void>;
  startNewDialogue(): void;
  closeAssistant(): void;
}

const AssistantPanelContext = createContext<AssistantPanelContextValue | null>(null);

function toPrompt(context: AssistantCaseContext): string {
  return `Explain why ${context.recommendation} is recommended for ${context.clientName} and cite the basis in context.`;
}

function createMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AssistantPanelProvider({ children }: PropsWithChildren) {
  const requestCounter = useRef(0);
  const [assistantCaseContext, setAssistantCaseContext] = useState<AssistantCaseContext | null>(null);
  const [fabAnchorElement, setFabAnchorElement] = useState<HTMLElement | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const { isPending, mutateAsync, reset } = useTaxPlanDetailsAssistantMutation();

  useEffect(() => {
    if (assistantCaseContext === null) {
      setDrawerOpen(false);
      setMessages([]);
      setErrorMessage(null);
      reset();
    }
  }, [assistantCaseContext, reset]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDrawerOpen]);

  const registerFabAnchor = useCallback((element: HTMLElement | null) => {
    setFabAnchorElement(element);
  }, []);

  const closeAssistant = useCallback(() => {
    requestCounter.current += 1;
    setDrawerOpen(false);
    setErrorMessage(null);
    reset();
  }, [reset]);

  const startNewDialogue = useCallback(() => {
    requestCounter.current += 1;
    setMessages([]);
    setErrorMessage(null);
    reset();
  }, [reset]);

  const runAssistantRequest = useCallback(
    async (requestId: number, caseId: string): Promise<void> => {
      try {
        const response = await mutateAsync({ caseId });
        if (requestCounter.current !== requestId) {
          return;
        }

        setMessages((current) => [
          ...current,
          {
            id: createMessageId("assistant"),
            role: "assistant",
            title: "Assistant response",
            body: response.message,
          },
        ]);
      } catch (error) {
        if (requestCounter.current !== requestId) {
          return;
        }

        const message = parseTaxPlanDetailsAssistantErrorMessage(error);
        setErrorMessage(message);
        setMessages((current) => [
          ...current,
          {
            id: createMessageId("error"),
            role: "error",
            title: "Assistant unavailable",
            body: message,
          },
        ]);
      }
    },
    [mutateAsync],
  );

  const openAssistant = useCallback(async () => {
    if (assistantCaseContext === null || isPending) {
      return;
    }

    const requestId = ++requestCounter.current;
    setDrawerOpen(true);
    setErrorMessage(null);
    setMessages([
      {
        id: createMessageId("user"),
        role: "user",
        title: "Advisor prompt",
        body: toPrompt(assistantCaseContext),
      },
    ]);

    await runAssistantRequest(requestId, assistantCaseContext.caseId);
  }, [assistantCaseContext, isPending, runAssistantRequest]);

  const sendMessage = useCallback(
    async (message: string) => {
      const trimmedMessage = message.trim();
      if (assistantCaseContext === null || trimmedMessage.length === 0 || isPending) {
        return;
      }

      const requestId = ++requestCounter.current;
      setErrorMessage(null);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId("user"),
          role: "user",
          title: "Advisor prompt",
          body: trimmedMessage,
        },
      ]);

      await runAssistantRequest(requestId, assistantCaseContext.caseId);
    },
    [assistantCaseContext, isPending, runAssistantRequest],
  );

  const value = useMemo<AssistantPanelContextValue>(
    () => ({
      assistantCaseContext,
      messages,
      errorMessage,
      isDrawerOpen,
      isLoading: isPending,
      setAssistantCaseContext,
      registerFabAnchor,
      openAssistant,
      sendMessage,
      startNewDialogue,
      closeAssistant,
      fabAnchorElement,
    }),
    [
      assistantCaseContext,
      isPending,
      closeAssistant,
      errorMessage,
      fabAnchorElement,
      isDrawerOpen,
      messages,
      openAssistant,
      registerFabAnchor,
      sendMessage,
      startNewDialogue,
    ],
  );

  return <AssistantPanelContext.Provider value={value}>{children}</AssistantPanelContext.Provider>;
}

export function useAssistantPanel(): AssistantPanelContextValue {
  const context = useContext(AssistantPanelContext);

  if (context === null) {
    throw new Error("useAssistantPanel must be used within an AssistantPanelProvider.");
  }

  return context;
}
