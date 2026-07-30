import type { ReactNode } from "react";

import styles from "./MetricCard.module.css";

type MetricTone = "indigo" | "cyan" | "amber" | "green" | "rose";

interface MetricCardProps {
  label: string;
  value: string;
  caption: string;
  tone?: MetricTone;
  icon?: ReactNode;
  valueClassName?: string;
}

export function MetricCard({
  label,
  value,
  caption,
  tone = "indigo",
  icon,
  valueClassName,
}: MetricCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.labelRow}>
        <span className={[styles.icon, styles[`icon${tone}`]].join(" ")} aria-hidden="true">
          {icon}
        </span>
        <p className={styles.label}>{label}</p>
      </div>
      <p className={[styles.value, valueClassName].filter(Boolean).join(" ")}>{value}</p>
      <p className={styles.caption}>{caption}</p>
    </article>
  );
}
