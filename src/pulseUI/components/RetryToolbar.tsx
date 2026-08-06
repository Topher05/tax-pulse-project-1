import { RefreshCw } from "lucide-react";

import styles from "./RetryToolbar.module.css";

export interface RetryToolbarProps {
  title: string;
  description: string;
  onRetry: () => void;
  retryLabel?: string;
}

export function RetryToolbar({
  title,
  description,
  onRetry,
  retryLabel = "Retry",
}: RetryToolbarProps) {
  return (
    <section className={styles.toolbar} role="toolbar" aria-label={title}>
      <div className={styles.copy}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
      </div>

      <button className={styles.action} type="button" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        <span>{retryLabel}</span>
      </button>
    </section>
  );
}
