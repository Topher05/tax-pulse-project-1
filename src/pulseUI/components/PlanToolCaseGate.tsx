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
        <h2 className={styles.title}>Select a tax plan to load {toolName}</h2>
        <p className={styles.copy}>
          {hasInvalidCaseId
            ? "This tax plan link is not valid. Choose an accessible tax plan from the selector above."
            : "Choose an accessible tax plan from the selector above before this tool loads or changes plan data."}
        </p>
      </div>
    </PanelCard>
  );
}
