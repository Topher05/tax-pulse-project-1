import type { ReactNode } from "react";

import styles from "./ToolHeader.module.css";

interface ToolHeaderProps {
  eyebrow?: string;
  title: string;
  titleId?: string;
  description?: string;
  contextControl?: ReactNode;
  action?: ReactNode;
}

export function ToolHeader({
  eyebrow,
  title,
  titleId,
  description,
  contextControl,
  action,
}: ToolHeaderProps) {
  return (
    <section className={styles.header}>
      <div className={styles.copy}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>

      {contextControl || action ? (
        <div className={styles.controls}>
          {action ? <div className={styles.action}>{action}</div> : null}
          {contextControl ? <div className={styles.contextControl}>{contextControl}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
