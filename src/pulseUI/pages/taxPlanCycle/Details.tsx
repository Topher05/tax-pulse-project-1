import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import styles from "./Details.module.css";
import {
  fetchTaxPlanCycleDetails,
  taxPlanCycleDetailsQueryKey,
} from "./queries.ts";

const detailsMessage = `hello Details page ${String.fromCodePoint(0x1f680)}`;

function PlanCycleDetailsCard({
  client,
  caseId,
  dueDate,
  owner,
  overdue,
  priority,
  scenarioCount,
  stage,
}: {
  client: string;
  caseId: string;
  dueDate: string;
  owner: string;
  overdue: boolean;
  priority: string;
  scenarioCount: number;
  stage: string;
}) {
  return (
    <section className={styles.card}>
      <dl className={styles.grid}>
        <div>
          <dt className={styles.label}>Case ID</dt>
          <dd className={styles.value}>{caseId}</dd>
        </div>
        <div>
          <dt className={styles.label}>Client</dt>
          <dd className={styles.value}>{client}</dd>
        </div>
        <div>
          <dt className={styles.label}>Stage</dt>
          <dd className={styles.value}>{stage}</dd>
        </div>
        <div>
          <dt className={styles.label}>Owner</dt>
          <dd className={styles.value}>{owner}</dd>
        </div>
        <div>
          <dt className={styles.label}>Priority</dt>
          <dd className={styles.value}>{priority}</dd>
        </div>
        <div>
          <dt className={styles.label}>Due Date</dt>
          <dd className={styles.value}>{overdue ? "Overdue" : dueDate}</dd>
        </div>
        <div>
          <dt className={styles.label}>Scenarios</dt>
          <dd className={styles.value}>{scenarioCount}</dd>
        </div>
      </dl>
    </section>
  );
}

export function DetailsPage() {
  const { id: caseId = "" } = useParams({ from: "/cycles/$id" });
  const detailsQuery = useQuery({
    queryKey: taxPlanCycleDetailsQueryKey(caseId),
    queryFn: () => fetchTaxPlanCycleDetails(caseId),
    enabled: caseId.length > 0,
  });

  return (
    <section className={styles.page}>
      <p className={styles.message}>{detailsMessage}</p>

      {detailsQuery.isPending ? (
        <p className={styles.loading}>Loading case details...</p>
      ) : null}

      {detailsQuery.isError ? (
        <p className={styles.error}>
          {detailsQuery.error instanceof Error
            ? detailsQuery.error.message
            : "Case details request failed."}
        </p>
      ) : null}

      {detailsQuery.data ? (
        <PlanCycleDetailsCard
          caseId={detailsQuery.data.caseId}
          client={detailsQuery.data.client}
          dueDate={detailsQuery.data.dueDate}
          owner={detailsQuery.data.owner}
          overdue={detailsQuery.data.overdue}
          priority={detailsQuery.data.priority}
          scenarioCount={detailsQuery.data.scenarioCount}
          stage={detailsQuery.data.stage}
        />
      ) : null}
    </section>
  );
}
