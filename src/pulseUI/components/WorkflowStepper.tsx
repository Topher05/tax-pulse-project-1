import styles from "./WorkflowStepper.module.css";

interface WorkflowStepperProps {
  stages: readonly string[];
  activeStage: string;
}

export function WorkflowStepper({ stages, activeStage }: WorkflowStepperProps) {
  const activeIndex = stages.indexOf(activeStage);

  return (
    <div className={styles.stepper} aria-label="Case stage progression">
      {stages.map((stage, index) => {
        const state =
          activeIndex === -1
            ? "upcoming"
            : index < activeIndex
              ? "done"
              : index === activeIndex
                ? "current"
                : "upcoming";
        const stateClass =
          state === "done"
            ? styles.done
            : state === "current"
              ? styles.current
              : styles.upcoming;

        return (
          <span className={[styles.step, stateClass].join(" ")} key={stage}>
            <span className={styles.dot} aria-hidden="true" />
            {stage}
          </span>
        );
      })}
    </div>
  );
}
