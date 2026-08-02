import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect, useId } from "react";
import { useFieldArray, useForm, type FieldErrors } from "react-hook-form";

import {
  createScenarioPlanningDefaults,
  createScenarioPlanningEntry,
  scenarioPlanningMaxCount,
} from "./constants.ts";
import { ScenarioPlanningScenarioCard } from "./ScenarioPlanningScenarioCard.tsx";
import { ScenarioPlanningStatusBar } from "./ScenarioPlanningStatusBar.tsx";
import styles from "./ScenarioPlanningForm.module.css";
import {
  scenarioPlanningFormSchema,
  type ScenarioPlanningFormInput,
  type ScenarioPlanningFormValues,
} from "./schema.ts";

interface ScenarioPlanningFormProps {
  caseId: string;
  onClose: () => void;
}

function getScenarioArrayErrorMessage(errors: FieldErrors<ScenarioPlanningFormValues>) {
  const scenarioErrors = errors?.scenarios;

  if (!scenarioErrors || Array.isArray(scenarioErrors)) {
    return null;
  }

  if (typeof scenarioErrors.root?.message === "string") {
    return scenarioErrors.root.message;
  }

  if (typeof scenarioErrors.message === "string") {
    return scenarioErrors.message;
  }

  return null;
}

export function ScenarioPlanningForm({ caseId, onClose }: ScenarioPlanningFormProps) {
  const modalTitleId = useId();
  const form = useForm<ScenarioPlanningFormInput, unknown, ScenarioPlanningFormValues>({
    resolver: zodResolver(scenarioPlanningFormSchema),
    defaultValues: createScenarioPlanningDefaults(),
    mode: "onSubmit",
    shouldFocusError: true,
  });

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = form;
  const { fields, append } = useFieldArray({
    control,
    name: "scenarios",
  });
  const scenarioCount = fields.length;
  const canAddScenario = scenarioCount < scenarioPlanningMaxCount;
  const arrayErrorMessage = getScenarioArrayErrorMessage(errors);

  const closeModal = () => {
    reset(createScenarioPlanningDefaults());
    onClose();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeModal]);

  const submitForm = handleSubmit(
    (values) => {
      // TODO: submission work is handled in Scrum-102.
      console.info("Scenario Planner submit", { caseId, ...values });
      closeModal();
    },
    (validationErrors) => {
      console.error("Scenario Planner validation failed", validationErrors);
    },
  );

  return (
    <div className={styles.modalOverlay} role="presentation" onClick={closeModal}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className={styles.header}>
          <div className={styles.headingCopy}>
            <p className={styles.kicker}>
              New What if Scenario Set
            </p>
            <h2 className={styles.title} id={modalTitleId}>
              New What-If Scenario
            </h2>
            <p className={styles.subheader}>Submit 2-5 scenarios against client baseline.</p>
          </div>

          <button className={styles.iconButton} type="button" aria-label="Close modal" onClick={closeModal}>
            <X aria-hidden="true" />
          </button>
        </header>

        <form className={styles.form} noValidate onSubmit={submitForm}>
          <div className={styles.intro}>
            <p className={styles.introLabel}>Case ID</p>
            <p className={styles.introValue}>{caseId}</p>
          </div>

          <div className={styles.scenarioStack}>
            {fields.map((field, index) => (
              <ScenarioPlanningScenarioCard
                key={field.id}
                index={index}
                register={register}
                errors={errors}
              />
            ))}
          </div>

          <ScenarioPlanningStatusBar
            scenarioCount={scenarioCount}
            arrayErrorMessage={arrayErrorMessage}
            canAddScenario={canAddScenario}
            isSubmitting={isSubmitting}
            onAddScenario={() => {
              if (!canAddScenario) {
                return;
              }

              append(createScenarioPlanningEntry());
            }}
            onClose={closeModal}
          />
        </form>
      </section>
    </div>
  );
}
