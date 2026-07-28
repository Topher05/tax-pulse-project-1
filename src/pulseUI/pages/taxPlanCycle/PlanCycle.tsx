import { AlertTriangle, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Queue } from "./Queue.tsx";
import {
  fetchTaxPlanCycleQueue,
  taxPlanCycleQueueQueryKey,
} from "./queries.ts";

function PlanCycleQueueLoadingState() {
  const skeletonRows = Array.from({ length: 5 }, (_, index) => index);

  return (
    <section
      className="queueState queueStateSkeleton"
      aria-label="Loading Plan Cycle Queue"
      aria-busy="true"
    >
      <div className="queueSkeletonHeader">
        <span className="queueSkeletonBlock queueSkeletonSummary" />
        <span className="queueSkeletonBlock queueSkeletonSummary" />
        <span className="queueSkeletonBlock queueSkeletonSummary" />
      </div>
      <div
        className="queueSkeletonTable"
        role="status"
        aria-label="Loading Plan Cycle Queue"
      >
        <span className="srOnly">Loading Plan Cycle Queue</span>
        {skeletonRows.map((row) => (
          <div className="queueSkeletonRow" key={row}>
            <span className="queueSkeletonBlock queueSkeletonCellLarge" />
            <span className="queueSkeletonBlock" />
            <span className="queueSkeletonBlock" />
            <span className="queueSkeletonBlock queueSkeletonCellSmall" />
          </div>
        ))}
      </div>
    </section>
  );
}

function PlanCycleQueueEmptyState() {
  return (
    <section className="queueState queueStateEmpty" aria-label="Empty Plan Cycle Queue">
      <h2>No open plan cycles</h2>
      <p>This tenant has no open cycles right now.</p>
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
    <section className="queueState queueStateError" role="alert">
      <AlertTriangle className="queueStateIcon" aria-hidden />
      <div>
        <h2>Queue could not load</h2>
        <p>{message}</p>
      </div>
      <button className="queueRetryButton" type="button" onClick={onRetry}>
        <RefreshCw aria-hidden />
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
