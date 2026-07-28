import { AlertTriangle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Queue } from "./Queue.tsx";

type PlanCycleQueueStateItem = unknown;

type PlanCycleQueueLoader = () => Promise<readonly PlanCycleQueueStateItem[]>;

const defaultPlanCycleQueueLoader: PlanCycleQueueLoader = async () => [
  { case_id: "default-queue-item" },
];

type QueueRequestState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "loaded"; itemCount: number }
  | { status: "error"; message: string };

interface PlanCycleProps {
  loadQueue?: PlanCycleQueueLoader;
  renderSuccess?: () => ReactNode;
}

export function PlanCycle({
  loadQueue = defaultPlanCycleQueueLoader,
  renderSuccess = () => <Queue />,
}: PlanCycleProps = {}) {
  return (
    <PlanCycleQueueStateManager loadQueue={loadQueue} renderSuccess={renderSuccess} />
  );
}

interface PlanCycleQueueStateManagerProps {
  loadQueue: PlanCycleQueueLoader;
  renderSuccess: () => ReactNode;
}

function PlanCycleQueueStateManager({
  loadQueue,
  renderSuccess,
}: PlanCycleQueueStateManagerProps) {
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

  // The dynamic loader can be extracted into its own reusable component later
  // if another route needs the same request-state orchestration.
  void requestState.itemCount;
  return <>{renderSuccess()}</>;
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
