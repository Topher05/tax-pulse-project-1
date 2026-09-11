import { useQuery } from "@tanstack/react-query";

import {
  fetchTaxPlanCycleQueue,
  taxPlanCycleQueueQueryKey,
} from "../entities/taxPlanCycleQueries.ts";
import { useAuthenticatedFetch } from "../auth/authenticatedFetch.ts";
import { formatTaxPlanLabel } from "../shared/displayLabels.ts";
import { isUuid, type Uuid } from "../shared/planToolCase.ts";

interface CurrentCaseSelectorProps {
  caseId: Uuid | null;
  onCaseIdChange: (caseId: Uuid) => void;
}

export function CurrentCaseSelector({
  caseId,
  onCaseIdChange,
}: CurrentCaseSelectorProps) {
  const authenticatedFetch = useAuthenticatedFetch();
  const queueQuery = useQuery({
    queryKey: taxPlanCycleQueueQueryKey,
    queryFn: () => fetchTaxPlanCycleQueue(authenticatedFetch),
  });
  const cases = queueQuery.data ?? [];
  const selectorTone = caseId === null ? "opacity-80" : "opacity-100";

  return (
    <label className="relative block w-full min-w-0 pt-2 min-[1031px]:w-[22rem]">
      <span className="absolute left-3 top-0 z-10 bg-[var(--pulse-surface)] px-1 text-[0.72rem] font-extrabold uppercase text-[var(--pulse-sidebar-muted)]">
        Tax plan
      </span>
      <select
        className={`min-h-10 w-full min-w-0 truncate rounded-[10px] border border-[var(--pulse-border)] bg-[var(--pulse-surface)] text-sm font-semibold normal-case text-[var(--pulse-ink)] shadow-sm outline-none transition focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--pulse-accent-light)] disabled:cursor-not-allowed disabled:opacity-50 ${selectorTone}`}
        style={{ padding: "18px 2px 10px 5px" }}
        value={caseId ?? ""}
        aria-label="Tax plan"
        disabled={queueQuery.isPending}
        onChange={(event) => {
          const selectedCaseId = event.target.value;

          if (isUuid(selectedCaseId)) {
            onCaseIdChange(selectedCaseId);
          }
        }}
      >
        <option value="">
          {queueQuery.isPending ? "Loading tax plans..." : "Select a tax plan"}
        </option>
        {cases.map((row) => (
          <option key={row.caseId} value={row.caseId}>
            {formatTaxPlanLabel({
              cycleLabel: row.cycleLabel,
              clientName: row.clientName,
              planningPeriod: row.planningPeriod,
            })}
          </option>
        ))}
      </select>
    </label>
  );
}
