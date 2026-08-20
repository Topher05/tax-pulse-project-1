import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import styles from "./PlanCycle.module.css";
import { Queue } from "./Queue.tsx";
import { useAuthenticatedFetch } from "../../auth/authenticatedFetch.ts";
import { EmptyState } from "../../components/EmptyState.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import {
  fetchTaxPlanCycleQueue,
  taxPlanCycleQueueQueryKey,
} from "../../entities/taxPlanCycleQueries.ts";

function PlanCycleQueueLoadingState() {
  const skeletonRows = Array.from({ length: 5 }, (_, index) => index);

  return (
    <PanelCard
      className={styles.stateCard}
      title="Loading Plan Cycle Queue"
      description="Fetching the latest queue and applying the current tenant filters."
    >
      <div className={styles.skeletonTable} role="status" aria-label="Loading Plan Cycle Queue">
        <span className="srOnly">Loading Plan Cycle Queue</span>
        <div className={styles.skeletonHeader}>
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
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function PlanCycleQueueEmptyState() {
  return (
    <EmptyState
      title="No open plan cycles"
      description="This tenant has no open cycles right now."
    />
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
    <div role="alert">
      <EmptyState
        title="Queue could not load"
        description={message}
        actionLabel="Retry"
        onAction={onRetry}
        icon={<RefreshCw />}
      />
    </div>
  );
}

export function PlanCycle() {
  const authenticatedFetch = useAuthenticatedFetch();
  const queueQuery = useQuery({
    queryKey: taxPlanCycleQueueQueryKey,
    queryFn: () => fetchTaxPlanCycleQueue(authenticatedFetch),
  });

  if (queueQuery.isPending) {
    return <PlanCycleQueueLoadingState />;
  }

  if (queueQuery.isError) {
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
