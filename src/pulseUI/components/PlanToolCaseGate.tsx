import { PanelCard } from "./PanelCard.tsx";
import styles from "./PlanToolCaseGate.module.css";

interface PlanToolCaseGateProps {
  hasInvalidCaseId: boolean;
  toolName: string;
}

export function PlanToolCaseGate({
  hasInvalidCaseId,
  toolName,
}: PlanToolCaseGateProps) {
  return (
    <PanelCard title={null} description={null}>
      <div className={styles.gate} role={hasInvalidCaseId ? "alert" : "status"}>
        <h2 className={styles.title}>Select a case to load {toolName}</h2>
        <p className={styles.copy}>
          {hasInvalidCaseId
            ? "The case ID in the URL is not valid. Choose an accessible Tax Plan Cycle from the selector above."
            : "Choose an accessible Tax Plan Cycle from the selector above before this tool fetches or changes case data."}
        </p>
      </div>
    </PanelCard>
  );
}
