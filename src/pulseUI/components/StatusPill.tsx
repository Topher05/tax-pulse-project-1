import type { ReactNode } from "react";

import styles from "./StatusPill.module.css";

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

interface StatusPillProps {
  children: ReactNode;
  tone?: StatusTone;
}

export function StatusPill({ children, tone = "neutral" }: StatusPillProps) {
  return <span className={[styles.pill, styles[tone]].join(" ")}>{children}</span>;
}
