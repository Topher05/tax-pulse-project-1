import type { ReactNode } from "react";

import styles from "./ToolHeader.module.css";

interface ToolHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function ToolHeader({ eyebrow, title, description, action }: ToolHeaderProps) {
  return (
    <section className={styles.header}>
      <div className={styles.copy}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h2 className={styles.title}>{title}</h2>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>

      {action ? <div className={styles.action}>{action}</div> : null}
    </section>
  );
}
