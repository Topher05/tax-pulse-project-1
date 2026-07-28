import { AlertTriangle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type PlanCycleQueueStateItem = unknown;

export type PlanCycleQueueLoader = () => Promise<readonly PlanCycleQueueStateItem[]>;

const defaultPlanCycleQueueLoader: PlanCycleQueueLoader = async () => [];

type QueueRequestState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "loaded"; itemCount: number }
  | { status: "error"; message: string };

export function PlanCycleQueueRoute() {
  return <PlanCycleQueueStateBoundary loadQueue={defaultPlanCycleQueueLoader} />;
}

interface PlanCycleQueueStateBoundaryProps {
  loadQueue: PlanCycleQueueLoader;
}

export function PlanCycleQueueStateBoundary({
  loadQueue,
}: PlanCycleQueueStateBoundaryProps) {
  const [requestState, setRequestState] = useState<QueueRequestState>({
    status: "loading",
  });
  const [requestAttempt, setRequestAttempt] = useState(0);

  useEffect(() => {
    let isCurrentRequest = true;

    setRequestState({ status: "loading" });

    loadQueue()
      .then((items) => {
        if (!isCurrentRequest) {
          return;
        }

        if (items.length === 0) {
          setRequestState({ status: "empty" });
          return;
        }

        setRequestState({ status: "loaded", itemCount: items.length });
      })
      .catch((error: unknown) => {
        if (!isCurrentRequest) {
          return;
        }

        setRequestState({
          status: "error",
          message: error instanceof Error ? error.message : "Queue request failed.",
        });
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [loadQueue, requestAttempt]);

  const retryQueueRequest = useCallback(() => {
    setRequestAttempt((attempt) => attempt + 1);
  }, []);

  if (requestState.status === "loading") {
    return <PlanCycleQueueLoadingState />;
  }

  if (requestState.status === "empty") {
    return <PlanCycleQueueEmptyState />;
  }

  if (requestState.status === "error") {
    return (
      <PlanCycleQueueErrorState
        message={requestState.message}
        onRetry={retryQueueRequest}
      />
    );
  }

  // SCRUM-93 should connect here by replacing this invisible success branch
  // with the Plan Cycle Queue table and KPI cards. SCRUM-94 intentionally
  // renders no non-empty queue content.
  void requestState.itemCount;
  return null;
}

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

interface PlanCycleQueueErrorStateProps {
  message: string;
  onRetry: () => void;
}

function PlanCycleQueueErrorState({
  message,
  onRetry,
}: PlanCycleQueueErrorStateProps) {
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
