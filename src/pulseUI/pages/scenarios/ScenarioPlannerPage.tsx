import { Plus } from "lucide-react";
import { useState } from "react";

import styles from "./ScenarioPlannerPage.module.css";
import { ScenarioPlanningForm } from "../../components/ScenarioPlanningForm.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";

export function ScenarioPlannerPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
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

      {isModalOpen ? <ScenarioPlanningForm onClose={() => setIsModalOpen(false)} /> : null}
    </section>
  );
}
