import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, X } from "lucide-react";

import {
  NotificationTheme,
  type NotificationMessage,
} from "../entities/notificationMessage.ts";

import styles from "./NotificationToast.module.css";

const exitAnimationMs = 220;

interface NotificationToastContextValue {
  showNotification: (notification: NotificationMessage) => void;
  dismissNotification: () => void;
}

const NotificationToastContext = createContext<NotificationToastContextValue | null>(null);

function getDefaultIcon(theme: NotificationTheme) {
  switch (theme) {
    case NotificationTheme.Success:
      return <CheckCircle2 className={styles.closeIcon} aria-hidden="true" />;
    case NotificationTheme.Error:
      return <AlertTriangle className={styles.closeIcon} aria-hidden="true" />;
    case NotificationTheme.Info:
      return <AlertCircle className={styles.closeIcon} aria-hidden="true" />;
  }
}

interface NotificationToastProps {
  notification: NotificationMessage;
  isVisible: boolean;
  onDismiss: () => void;
}

export function NotificationToast({ notification, isVisible, onDismiss }: NotificationToastProps) {
  const Icon = notification.icon ?? getDefaultIcon(notification.theme);
  const ariaRole = notification.theme === NotificationTheme.Error ? "alert" : "status";

  return (
    <section className={[ styles.toast, isVisible ? styles.toastVisible : styles.toastHidden,].join(" ")}
      data-theme={notification.theme}
      aria-live={notification.theme === NotificationTheme.Error ? "assertive" : "polite"}
      role={ariaRole}>
      <div className={styles.icon} data-theme={notification.theme} aria-hidden="true">
        {Icon}
      </div>

      <div className={styles.copy}>
        <h2 className={styles.header}>{notification.messageHeader}</h2>
        <p className={styles.body}>{notification.message}</p>
      </div>

      <button className={styles.closeButton}
        type="button"
        aria-label="Close notification"
        onClick={onDismiss}>
        <X className={styles.closeIcon} aria-hidden="true" />
      </button>
    </section>
  );
}

export function NotificationToastProvider({ children }: PropsWithChildren) {
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const autoDismissTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (autoDismissTimerRef.current !== null) {
      window.clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }

    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const dismissNotification = useCallback(() => {
    setIsVisible(false);
    clearTimers();

    if (notification === null) {
      return;
    }

    exitTimerRef.current = window.setTimeout(() => {
      setNotification(null);
      exitTimerRef.current = null;
    }, exitAnimationMs);
  }, [clearTimers, notification]);

  const showNotification = useCallback(
    (nextNotification: NotificationMessage) => {
      clearTimers();
      setNotification(nextNotification);
      setIsVisible(true);
    },
    [clearTimers],
  );

  useEffect(() => {
    if (notification === null || !isVisible) {
      return undefined;
    }

    autoDismissTimerRef.current = window.setTimeout(() => {
      dismissNotification();
    }, notification.displayTimeMs ?? 3000);

    return () => {
      if (autoDismissTimerRef.current !== null) {
        window.clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = null;
      }
    };
  }, [dismissNotification, isVisible, notification]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const contextValue = useMemo<NotificationToastContextValue>(
    () => ({
      showNotification,
      dismissNotification,
    }),
    [dismissNotification, showNotification],
  );

  return (
    <NotificationToastContext.Provider value={contextValue}>
      {children}
      {notification === null ? null : (
        <div className={styles.host}>
          <NotificationToast
            notification={notification}
            isVisible={isVisible}
            onDismiss={dismissNotification}
          />
        </div>
      )}
    </NotificationToastContext.Provider>
  );
}

export function useNotificationToast() {
  const context = useContext(NotificationToastContext);

  if (context === null) {
    throw new Error("useNotificationToast must be used within a NotificationToastProvider.");
  }

  return context;
}
