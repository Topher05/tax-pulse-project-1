import { Plus } from "lucide-react";
import { useState } from "react";
import { useSearch } from "@tanstack/react-router";

import styles from "./ScenarioPlannerPage.module.css";
import { PlanToolCaseGate } from "../../components/PlanToolCaseGate.tsx";
import { ScenarioForm } from "../../components/ScenarioForm.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";

export function ScenarioPlannerPage() {
  const search = useSearch({ from: "/scenarios" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const caseId = search.caseId ?? null;
  const hasInvalidCaseId = search.invalidCaseId ?? false;

  if (!caseId) {
    return <PlanToolCaseGate hasInvalidCaseId={hasInvalidCaseId} toolName="Scenario Planner" />;
  }

  const headerAction = (
    <button
      className={`${styles.launchButton} disabled:cursor-not-allowed disabled:opacity-50`}
      type="button"
      aria-disabled={false}
      onClick={() => {
        setIsModalOpen(true);
      }}
    >
      <Plus aria-hidden="true" />
      New What-If Scenario
    </button>
  );

  return (
    <section className={styles.page}>
      <ToolHeader
        title="Scenario Planner"
        action={headerAction}
      />

      <div className={styles.launchCard}>
        <div className={styles.launchCopy}>
          <p className={styles.launchKicker}>Scenario workspace</p>
          <p className={styles.launchDescription}>
            Open the modal to capture a new what-if scenario for this advisory workflow.
          </p>
        </div>
      </div>

      <section className={styles.tableShell} aria-label="Scenario table area">
        {/* TODO: Tanstack table fetch/post behavior in Jira-102 */}
      </section>

      {isModalOpen ? (
        <ScenarioForm caseId={caseId} onClose={() => setIsModalOpen(false)} />
      ) : null}
    </section>
  );
}
