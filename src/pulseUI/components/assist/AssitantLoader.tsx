import styles from "./AssitantLoader.module.css";

interface AssitantLoaderProps {
  readonly variant?: "main" | "composer";
}

export function AssitantLoader({ variant = "main" }: AssitantLoaderProps) {
  if (variant === "composer") {
    return (
      <div className={styles.composerSkeleton} aria-hidden="true">
        <div className={styles.skeletonInput} />
        <div className={styles.skeletonFooter}>
          <div className={styles.skeletonDisclaimer} />
          <div className={styles.skeletonSend} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loader} role="status" aria-label="Loading assistant">
      <div className={styles.skeletonToolbar} aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div className={styles.skeletonToolbarButton} key={`toolbar-skeleton-${index}`} />
        ))}
      </div>

      <div className={styles.center}>
        <div className={styles.spinner} aria-hidden="true">
          <span className={styles.spinnerCore} />
        </div>
        <div className={styles.copy}>
          <p>Preparing the assistant workspace</p>
          <span>Loading citations, response scaffolding, and the case context.</span>
        </div>
      </div>

    </div>
  );
}
