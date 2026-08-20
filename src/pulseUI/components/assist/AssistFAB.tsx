import { BotMessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import styles from "./AssistFAB.module.css";

interface AssistFABProps {
  readonly isOpen: boolean;
  onOpen: () => void;
}

export function AssistFAB({ isOpen, onOpen }: AssistFABProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const spinTimeoutRef = useRef<number | null>(null);

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
    }, 840);
  };

  return (
    <button
      type="button"
      aria-label="Open RAG assistant"
      aria-pressed={isOpen}
      className={[
        styles.fab,
        "fixed bottom-6 right-6 z-[65] inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-[color:var(--pulse-surface)] text-[color:var(--pulse-ink)] shadow-[0_18px_48px_rgba(0,0,0,0.35)] transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pulse-accent-light)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--pulse-page)] sm:bottom-8 sm:right-8 sm:h-[4.5rem] sm:w-[4.5rem]",
        isSpinning ? styles.fabSpinning : "",
      ].join(" ")}
      onClick={handleClick}
      title="Open RAG assistant"
    >
      <BotMessageSquare className={styles.fabIcon} aria-hidden="true" />
      <span className="sr-only">Open RAG assistant</span>
    </button>
  );
}
