import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";

import { useAuthenticatedFetch } from "../../auth/authenticatedFetch.ts";
import {
  postTaxPlanDetailsAssistant,
  parseTaxPlanDetailsAssistantErrorMessage,
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
  setAssistantCaseContext(context: AssistantCaseContext | null): void;
  openAssistant(): Promise<void>;
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
  const authenticatedFetch = useAuthenticatedFetch();
  const requestCounter = useRef(0);
  const [assistantCaseContext, setAssistantCaseContext] = useState<AssistantCaseContext | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    if (assistantCaseContext === null) {
      setDrawerOpen(false);
      setLoading(false);
      setMessages([]);
      setErrorMessage(null);
    }
  }, [assistantCaseContext]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDrawerOpen]);

  const closeAssistant = useCallback(() => {
    requestCounter.current += 1;
    setDrawerOpen(false);
    setLoading(false);
    setErrorMessage(null);
  }, []);

  const openAssistant = useCallback(async () => {
    if (assistantCaseContext === null || isLoading) {
      return;
    }

    const requestId = ++requestCounter.current;
    setDrawerOpen(true);
    setLoading(true);
    setErrorMessage(null);
    setMessages([
      {
        id: createMessageId("user"),
        role: "user",
        title: "Advisor prompt",
        body: toPrompt(assistantCaseContext),
      },
    ]);

    try {
      const response = await postTaxPlanDetailsAssistant(authenticatedFetch);
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
    } finally {
      if (requestCounter.current === requestId) {
        setLoading(false);
      }
    }
  }, [assistantCaseContext, authenticatedFetch, isLoading]);

  const value = useMemo<AssistantPanelContextValue>(
    () => ({
      assistantCaseContext,
      messages,
      errorMessage,
      isDrawerOpen,
      isLoading,
      setAssistantCaseContext,
      openAssistant,
      closeAssistant,
    }),
    [assistantCaseContext, closeAssistant, errorMessage, isDrawerOpen, isLoading, messages, openAssistant],
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
