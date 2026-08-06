import styles from "./ClientRosterSkeletonLoader.module.css";
import { PanelCard } from "./PanelCard.tsx";

export function ClientRosterSkeletonLoader() {
  const skeletonRows = Array.from({ length: 25 }, (_, index) => index);

  return (
    <PanelCard
      className={styles.stateCard}
      title="Loading Client Roster"
      description="Fetching the latest roster for the current firm."
    >
      <div className={styles.skeletonTable} role="status" aria-label="Loading Client Roster">
        <span className="srOnly">Loading Client Roster</span>
        <div className={styles.skeletonHeader}>
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
        </div>
        {skeletonRows.map((row) => (
          <div className={styles.skeletonRow} key={row}>
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
          </div>
        ))}
      </div>
    </PanelCard>
  );
}
