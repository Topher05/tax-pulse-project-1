import type { ReactElement, FocusEventHandler, MouseEventHandler } from "react";
import { cloneElement, useId, useState } from "react";

import styles from "./Tooltips.module.css";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  readonly content: string;
  readonly placement?: TooltipPlacement;
  readonly children: ReactElement<{
    "aria-describedby"?: string;
    onBlur?: FocusEventHandler<HTMLElement>;
    onClickCapture?: MouseEventHandler<HTMLElement>;
    onFocus?: FocusEventHandler<HTMLElement>;
    onMouseEnter?: MouseEventHandler<HTMLElement>;
    onMouseLeave?: MouseEventHandler<HTMLElement>;
  }>;
}

export function Tooltip({ content, placement = "top", children }: TooltipProps) {
  const tooltipId = useId();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const isVisible = (isHovered || isFocused) && !isDismissed;

  const child = cloneElement(children, {
    "aria-describedby": [children.props["aria-describedby"], tooltipId].filter(Boolean).join(" ") || undefined,
    onBlur: (event) => {
      children.props.onBlur?.(event);
      setIsFocused(false);
      setIsHovered(false);
      setIsDismissed(false);
    },
    onClickCapture: (event) => {
      children.props.onClickCapture?.(event);
      setIsDismissed(true);
    },
    onFocus: (event) => {
      children.props.onFocus?.(event);
      setIsFocused(true);
      setIsDismissed(false);
    },
    onMouseEnter: (event) => {
      children.props.onMouseEnter?.(event);
      setIsHovered(true);
      setIsDismissed(false);
    },
    onMouseLeave: (event) => {
      children.props.onMouseLeave?.(event);
      setIsHovered(false);
      setIsDismissed(false);
    },
  });

  return (
    <span className={[styles.root, styles[placement]].join(" ")}>
      {child}
      <span
        id={tooltipId}
        className={styles.tooltip}
        data-visible={isVisible ? "true" : "false"}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}
