import { BotMessageSquare } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

import { Tooltip } from "./Tooltips.tsx";
import styles from "./AssistFAB.module.css";

interface AssistFABProps {
  readonly isOpen: boolean;
  readonly anchorElement: HTMLElement | null;
  onOpen: () => void;
}

export function AssistFAB({ isOpen, anchorElement, onOpen }: AssistFABProps) {
  const [isAnchored, setIsAnchored] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const spinTimeoutRef = useRef<number | null>(null);

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

  const handleClick = () => {
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

  const button = (
    <Tooltip content="Open RAG assistant" placement={isAnchored ? "top" : "left"}>
      <button
        type="button"
        aria-label="Open RAG assistant"
        aria-pressed={isOpen}
        className={[
          styles.fab,
          isAnchored ? styles.anchored : styles.fallback,
          isSpinning ? styles.fabSpinning : "",
        ].join(" ")}
        onClick={handleClick}
      >
        <BotMessageSquare className={styles.fabIcon} aria-hidden="true" />
      </button>
    </Tooltip>
  );

  if (isAnchored && anchorElement !== null) {
    return createPortal(button, anchorElement);
  }

  return button;
}
