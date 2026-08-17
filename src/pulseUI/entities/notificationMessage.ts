import type { ReactNode } from "react";

export enum NotificationTheme {
  Success = "success",
  Error = "error",
  Info = "info",
}

export interface NotificationMessage {
  id: string;
  theme: NotificationTheme;
  message: string;
  messageHeader: string;
  displayTimeMs?: number;
  icon?: ReactNode;
}

function createNotificationId(): string {
  const cryptoObject = globalThis.crypto;

  if (cryptoObject && typeof cryptoObject.randomUUID === "function") {
    return cryptoObject.randomUUID();
  }

  return `notification-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createNotificationMessage(
  theme: NotificationTheme,
  message: string,
  messageHeader: string,
  displayTimeMs = 3000,
  icon?: ReactNode,
): NotificationMessage {
  return {
    id: createNotificationId(),
    theme,
    message,
    messageHeader,
    displayTimeMs,
    icon,
  };
}

export function createSuccessNotificationMessage(
  message: string,
  messageHeader: string,
  displayTimeMs?: number,
  icon?: ReactNode,
): NotificationMessage {
  return createNotificationMessage(
    NotificationTheme.Success,
    message,
    messageHeader,
    displayTimeMs,
    icon,
  );
}

export function createErrorNotificationMessage(
  message: string,
  messageHeader: string,
  displayTimeMs?: number,
  icon?: ReactNode,
): NotificationMessage {
  return createNotificationMessage(
    NotificationTheme.Error,
    message,
    messageHeader,
    displayTimeMs,
    icon,
  );
}

export function createInfoNotificationMessage(
  message: string,
  messageHeader: string,
  displayTimeMs?: number,
  icon?: ReactNode,
): NotificationMessage {
  return createNotificationMessage(
    NotificationTheme.Info,
    message,
    messageHeader,
    displayTimeMs,
    icon,
  );
}
