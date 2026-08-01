import { useQuery } from "@tanstack/react-query";
import { List } from "lucide-react";

import {
  fetchTaxPlanCycleQueue,
  taxPlanCycleQueueQueryKey,
} from "../entities/taxPlanCycleQueries.ts";
import { isUuid, type Uuid } from "../shared/planToolCase.ts";

interface CurrentCaseSelectorProps {
  caseId: Uuid | null;
  onCaseIdChange: (caseId: Uuid) => void;
}

export function CurrentCaseSelector({
  caseId,
  onCaseIdChange,
}: CurrentCaseSelectorProps) {
  const queueQuery = useQuery({
    queryKey: taxPlanCycleQueueQueryKey,
    queryFn: fetchTaxPlanCycleQueue,
  });

  const cases = queueQuery.data ?? [];

  return (
    <label className="grid w-full min-w-0 gap-1.5 text-[0.72rem] font-extrabold uppercase text-[var(--pulse-sidebar-muted)] sm:w-[22rem]">
      <span>Case ID</span>
      <span className="relative block min-w-0">
        <List
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white"
          aria-hidden="true"
        />
        <select
          className="min-h-10 w-full min-w-0 appearance-none truncate rounded-[10px] border border-[var(--pulse-border)] bg-[var(--pulse-surface)] py-0 pl-10 pr-4 text-sm font-semibold normal-case text-[var(--pulse-ink)] shadow-sm outline-none transition focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--pulse-accent-light)] disabled:cursor-not-allowed disabled:opacity-50"
          value={caseId ?? ""}
          aria-label="Case ID"
          disabled={queueQuery.isPending}
          onChange={(event) => {
            const selectedCaseId = event.target.value;

            if (isUuid(selectedCaseId)) {
              onCaseIdChange(selectedCaseId);
            }
          }}
        >
          <option value="">
            {queueQuery.isPending ? "Loading case IDs..." : "Select a Case ID"}
          </option>
          {cases.map((row) => (
            <option key={row.caseId} value={row.caseId}>
              {row.caseId}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
