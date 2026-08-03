import { Plus, Save, X } from "lucide-react";

import { scenarioMaxCount, scenarioMinCount } from "./constants.ts";
import styles from "./StatusFooter.module.css";

interface StatusFooterProps {
  scenarioCount: number;
  arrayErrorMessage?: string | null;
  canAddScenario: boolean;
  isSubmitting: boolean;
  onAddScenario: () => void;
  onClose: () => void;
}

function describeSlots(scenarioCount: number) {
  if (scenarioCount >= scenarioMaxCount) {
    return "0 scenario slots left, Maximum allowed scenarios";
  }

  const slotsLeft = scenarioMaxCount - scenarioCount;

  if (scenarioCount >= scenarioMinCount) {
    return `${slotsLeft} ${slotsLeft === 1 ? "scenario slot left" : "scenario slots left"}`;
  }

  const additionalRequired = scenarioMinCount - scenarioCount;

  return `${slotsLeft} ${slotsLeft === 1 ? "scenario slot left" : "scenario slots left"} ${additionalRequired} ${additionalRequired === 1 ? "additional scenario required" : "additional scenarios required"}`;
}

export function StatusFooter({
  scenarioCount,
  arrayErrorMessage,
  canAddScenario,
  isSubmitting,
  onAddScenario,
  onClose,
}: StatusFooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.copy}>
        {arrayErrorMessage ? (
          <p className={styles.error} role="alert">
            {arrayErrorMessage}
          </p>
        ) : null}
        <p className={styles.statusText}>
          {describeSlots(scenarioCount)}
        </p>
      </div>

      <div className={styles.buttonGroup}>
        <button
          className={`${styles.button} ${styles.secondaryButton}`}
          type="button"
          onClick={onClose}
        >
          <X className={styles.icon} aria-hidden="true" />
          <span>Cancel</span>
        </button>
        <button
          className={`${styles.button} ${styles.infoButton}`}
          type="button"
          onClick={onAddScenario}
          disabled={!canAddScenario}
        >
          <Plus className={styles.icon} aria-hidden="true" />
          <span>Add additional scenario</span>
        </button>
        <button
          className={`${styles.button} ${styles.primaryButton}`}
          type="submit"
          disabled={isSubmitting}
        >
          <span className={styles.createIconStack} aria-hidden="true">
            <Save className={styles.saveIcon} />
            <Plus className={styles.plusBadge} />
          </span>
          <span>Create Scenario</span>
        </button>
      </div>
    </footer>
  );
}
