import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <section className={styles.card} aria-label={title}>
      <div className={styles.icon} aria-hidden="true">
        {icon ?? <AlertTriangle />}
      </div>
      <div className={styles.copy}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
      </div>
      {actionLabel && onAction ? (
        <button className={styles.action} type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
