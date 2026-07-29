import { Plus } from "lucide-react";
import { useState } from "react";

import styles from "./ScenarioPlannerPage.module.css";
import { ScenarioPlanningForm } from "../../components/ScenarioPlanningForm.tsx";

export function ScenarioPlannerPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section className={styles.page}>
      <div className={styles.launchCard}>
        <div className={styles.launchCopy}>
          <p className={styles.launchKicker}>Scenario workspace</p>
          <h2 className={styles.launchTitle}>Scenario Planner</h2>
          <p className={styles.launchDescription}>
            Open the modal to capture a new what-if scenario for this advisory workflow.
          </p>
        </div>

        <button
          className={styles.launchButton}
          type="button"
          onClick={() => {
            setIsModalOpen(true);
          }}
        >
          <Plus aria-hidden="true" />
          New What-If Scenario
        </button>
      </div>

      {isModalOpen ? <ScenarioPlanningForm onClose={() => setIsModalOpen(false)} /> : null}
    </section>
  );
}
