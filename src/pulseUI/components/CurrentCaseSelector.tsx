import { useQuery } from "@tanstack/react-query";

import styles from "./CurrentCaseSelector.module.css";
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
    <label className={styles.field}>
      <span>Client Case</span>
      <select
        className={styles.select}
        value={caseId ?? ""}
        aria-label="Client Case ID"
        disabled={queueQuery.isPending}
        onChange={(event) => {
          const selectedCaseId = event.target.value;

          if (isUuid(selectedCaseId)) {
            onCaseIdChange(selectedCaseId);
          }
        }}
      >
        <option value="">
          {queueQuery.isPending ? "Loading case IDs..." : "Select a Client Case ID"}
        </option>
        {cases.map((row) => (
          <option key={row.caseId} value={row.caseId}>
            {row.caseId}
          </option>
        ))}
      </select>
    </label>
  );
}
