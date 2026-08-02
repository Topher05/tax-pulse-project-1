import { Plus } from "lucide-react";

import {
  scenarioPlanningMaxCount,
  scenarioPlanningMinCount,
} from "./constants.ts";
import styles from "./ScenarioPlanningForm.module.css";

interface ScenarioPlanningStatusBarProps {
  scenarioCount: number;
  arrayErrorMessage?: string | null;
  canAddScenario: boolean;
  isSubmitting: boolean;
  onAddScenario: () => void;
  onClose: () => void;
}

function describeScenarioSlots(scenarioCount: number) {
  if (scenarioCount >= scenarioPlanningMaxCount) {
    return "0 scenario slots left, Maximum allowed scenarios";
  }

  const slotsLeft = scenarioPlanningMaxCount - scenarioCount;
  const slotsLabel = slotsLeft === 1 ? "scenario slot left" : "scenario slots left";

  if (scenarioCount >= scenarioPlanningMinCount) {
    return `${slotsLeft} ${slotsLabel}`;
  }

  const additionalRequired = scenarioPlanningMinCount - scenarioCount;
  const requiredLabel =
    additionalRequired === 1 ? "additional scenario required" : "additional scenarios required";

  return `${slotsLeft} ${slotsLabel} ${additionalRequired} ${requiredLabel}`;
}

export function ScenarioPlanningStatusBar({
  scenarioCount,
  arrayErrorMessage,
  canAddScenario,
  isSubmitting,
  onAddScenario,
  onClose,
}: ScenarioPlanningStatusBarProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerCopy}>
        {arrayErrorMessage ? (
          <p className={styles.footerError} role="alert">
            {arrayErrorMessage}
          </p>
        ) : null}
        <p className={styles.footerStatus}>{describeScenarioSlots(scenarioCount)}</p>
      </div>

      <div className={styles.actions}>
        <button className={styles.secondaryButton} type="button" onClick={onClose}>
          Cancel
        </button>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={onAddScenario}
          disabled={!canAddScenario}
        >
          <Plus className={styles.buttonIcon} aria-hidden="true" />
          Add additional scenario
        </button>
        <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
          Create Scenario
        </button>
      </div>
    </footer>
  );
}

