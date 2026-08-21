import type { ReactNode } from "react";
import { useId } from "react";

import styles from "./Tooltips.module.css";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  readonly content: string;
  readonly placement?: TooltipPlacement;
  readonly children: ReactNode;
}

export function Tooltip({ content, placement = "top", children }: TooltipProps) {
  const tooltipId = useId();

  return (
    <span className={[styles.root, styles[placement]].join(" ")}>
      {children}
      <span id={tooltipId} className={styles.tooltip} role="tooltip">
        {content}
      </span>
    </span>
  );
}
