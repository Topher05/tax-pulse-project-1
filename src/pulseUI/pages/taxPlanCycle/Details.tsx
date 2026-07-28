import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

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
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Case ID
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-950">{caseId}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Client
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-950">{client}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Stage
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-950">{stage}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Owner
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-950">{owner}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Priority
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-950">{priority}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Due Date
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-950">
            {overdue ? "Overdue" : dueDate}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Scenarios
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-950">{scenarioCount}</dd>
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
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-lg font-semibold text-slate-950">{detailsMessage}</p>

      {detailsQuery.isPending ? (
        <p className="mt-4 text-sm text-slate-600">Loading case details...</p>
      ) : null}

      {detailsQuery.isError ? (
        <p className="mt-4 text-sm text-rose-700">
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
