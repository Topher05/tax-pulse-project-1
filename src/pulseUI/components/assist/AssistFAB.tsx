import { BotMessageSquare } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";

import styles from "./AssistFAB.module.css";

interface AssistFABProps {
  readonly isOpen: boolean;
  readonly anchorElement: HTMLElement | null;
  onOpen: () => void;
}

export function AssistFAB({ isOpen, anchorElement, onOpen }: AssistFABProps) {
  const [isAnchored, setIsAnchored] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(isOpen);
  const spinTimeoutRef = useRef<number | null>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (anchorElement === null || typeof IntersectionObserver === "undefined") {
      setIsAnchored(false);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsAnchored(entry?.isIntersecting ?? false);
      },
      { threshold: 0.1 },
    );
    observer.observe(anchorElement);

    return () => {
      observer.disconnect();
    };
  }, [anchorElement]);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current !== null) {
        window.clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      buttonRef.current?.focus();
    }

    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const handleClick = () => {
    if (isOpen) {
      return;
    }

    if (spinTimeoutRef.current !== null) {
      window.clearTimeout(spinTimeoutRef.current);
    }

    setIsSpinning(true);
    onOpen();
    spinTimeoutRef.current = window.setTimeout(() => {
      setIsSpinning(false);
      spinTimeoutRef.current = null;
    }, 600);
  };

  const boundaryClassName = [
    styles.fabTooltipBoundary,
    isAnchored ? styles.anchored : styles.fallback,
  ].join(" ");
  const button = (
    <div
      aria-hidden={isOpen}
      className={boundaryClassName}
      data-state={isOpen ? "drawer-open" : "drawer-closed"}
      onMouseEnter={() => setIsTooltipVisible(true)}
      onMouseLeave={() => setIsTooltipVisible(false)}
      onFocus={() => setIsTooltipVisible(true)}
      onBlur={() => setIsTooltipVisible(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label="Open RAG assistant"
        aria-pressed={isOpen}
        aria-describedby={isTooltipVisible ? tooltipId : undefined}
        className={[styles.fab, isSpinning ? styles.fabSpinning : ""].join(" ")}
        disabled={isOpen}
        onClick={handleClick}
      >
        <BotMessageSquare className={styles.fabIcon} aria-hidden="true" />
      </button>
      <span
        id={tooltipId}
        className={[styles.fabTooltip, styles.tooltipTop, isTooltipVisible ? styles.fabTooltipVisible : ""].join(" ")}
        role="tooltip"
        aria-hidden={!isTooltipVisible}
      >
        Open RAG assistant
      </span>
    </div>
  );

  if (isAnchored && anchorElement !== null) {
    return createPortal(button, anchorElement);
  }

  return button;
}
