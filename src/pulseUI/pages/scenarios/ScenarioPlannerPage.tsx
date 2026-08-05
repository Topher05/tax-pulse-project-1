import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";

import styles from "./ScenarioPlannerPage.module.css";
import { CurrentCaseSelector } from "../../components/CurrentCaseSelector.tsx";
import { PlanToolCaseGate } from "../../components/PlanToolCaseGate.tsx";
import { ScenarioForm } from "../../components/ScenarioForm.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";

export function ScenarioPlannerPage() {
  const search = useSearch({ from: "/_workspace/scenarios" });
  const navigate = useNavigate({ from: "/scenarios" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const caseId = search.caseId ?? null;
  const hasInvalidCaseId = search.invalidCaseId ?? false;

  const headerAction = (
    <button
      className={`${styles.launchButton} disabled:cursor-not-allowed disabled:opacity-50`}
      type="button"
      disabled={caseId === null}
      onClick={() => {
        setIsModalOpen(true);
      }}
    >
      <Plus aria-hidden="true" />
      New scenario
    </button>
  );

  return (
    <section className={styles.page}>
      <ToolHeader
        title="Scenario Planner"
        contextControl={
          <CurrentCaseSelector
            caseId={caseId}
            onCaseIdChange={(nextCaseId) => {
              void navigate({
                search: {
                  caseId: nextCaseId,
                },
                replace: true,
              });
            }}
          />
        }
        action={headerAction}
      />

      {caseId ? (
        <>
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
            <ScenarioForm onClose={() => setIsModalOpen(false)} />
          ) : null}
        </>
      ) : (
        <PlanToolCaseGate hasInvalidCaseId={hasInvalidCaseId} toolName="Scenario Planner" />
      )}
    </section>
  );
}
