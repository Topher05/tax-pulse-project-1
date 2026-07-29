import { AlertTriangle, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import styles from "./PlanCycle.module.css";
import { Queue } from "./Queue.tsx";
import {
  fetchTaxPlanCycleQueue,
  taxPlanCycleQueueQueryKey,
} from "./queries.ts";

function PlanCycleQueueLoadingState() {
  const skeletonRows = Array.from({ length: 5 }, (_, index) => index);

  return (
    <section
      className={`${styles.stateCard} ${styles.skeletonState}`}
      aria-label="Loading Plan Cycle Queue"
      aria-busy="true"
    >
      <div className={styles.skeletonHeader}>
        <span className={`${styles.skeletonBlock} ${styles.skeletonSummary}`} />
        <span className={`${styles.skeletonBlock} ${styles.skeletonSummary}`} />
        <span className={`${styles.skeletonBlock} ${styles.skeletonSummary}`} />
      </div>
      <div className={styles.skeletonTable} role="status" aria-label="Loading Plan Cycle Queue">
        <span className={styles.srOnly}>Loading Plan Cycle Queue</span>
        {skeletonRows.map((row) => (
          <div className={styles.skeletonRow} key={row}>
            <span className={`${styles.skeletonBlock} ${styles.skeletonCellLarge}`} />
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
            <span className={`${styles.skeletonBlock} ${styles.skeletonCellSmall}`} />
          </div>
        ))}
      </div>
    </section>
  );
}

function PlanCycleQueueEmptyState() {
  return (
    <section className={`${styles.stateCard} ${styles.emptyState}`} aria-label="Empty Plan Cycle Queue">
      <div>
        <h2 className={styles.stateHeading}>No open plan cycles</h2>
        <p className={styles.stateCopy}>This tenant has no open cycles right now.</p>
      </div>
    </section>
  );
}

function PlanCycleQueueErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className={`${styles.stateCard} ${styles.errorState}`} role="alert">
      <AlertTriangle className={styles.stateIcon} aria-hidden />
      <div>
        <h2 className={styles.stateHeading}>Queue could not load</h2>
        <p className={styles.stateCopy}>{message}</p>
      </div>
      <button className={styles.retryButton} type="button" onClick={onRetry}>
        <RefreshCw className={styles.retryButtonIcon} aria-hidden />
        Retry
      </button>
    </section>
  );
}

export function PlanCycle() {
  const queueQuery = useQuery({
    queryKey: taxPlanCycleQueueQueryKey,
    queryFn: fetchTaxPlanCycleQueue,
  });

  if (queueQuery.isPending) {
    console.log('A')
    return <PlanCycleQueueLoadingState />;
  }

  if (queueQuery.isError) {
    console.log('B')
    console.log(queueQuery)
    return (
      <PlanCycleQueueErrorState
        message={queueQuery.error instanceof Error ? queueQuery.error.message : "Queue request failed."}
        onRetry={() => {
          void queueQuery.refetch();
        }}
      />
    );
  }

  const queueRows = queueQuery.data ?? [];

  if (queueRows.length === 0) {
    return <PlanCycleQueueEmptyState />;
  }

  return <Queue rows={queueRows} />;
}
