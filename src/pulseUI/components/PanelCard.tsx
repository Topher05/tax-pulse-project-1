import type { ReactNode } from "react";

import styles from "./PanelCard.module.css";

interface PanelCardProps {
  title?: string | null;
  description?: string | null;
  action?: ReactNode | null;
  children: ReactNode;
  className?: string;
}

export function PanelCard({
  title,
  description,
  action,
  children,
  className,
}: PanelCardProps) {
  return (
    <section className={[styles.card, className].filter(Boolean).join(" ")}>
      {title || description || action ? (
        <header className={styles.header}>
          <div className={styles.headingGroup}>
            {title ? <h2 className={styles.title}>{title}</h2> : null}
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          {action ? <div className={styles.action}>{action}</div> : null}
        </header>
      ) : null}
      <div className={styles.body}>{children}</div>
    </section>
  );
}
