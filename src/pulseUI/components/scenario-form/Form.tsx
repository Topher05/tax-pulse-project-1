import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useEffect, useId } from "react";
import { useFieldArray, useForm, type FieldErrors } from "react-hook-form";

import { createScenarioEntry, scenarioMaxCount } from "./constants.ts";
import styles from "./Form.module.css";
import { ScenarioCard } from "./ScenarioCard.tsx";
import { StatusFooter } from "./StatusFooter.tsx";
import {
  createScenarioDefaults,
  scenarioFormSchema,
  type ScenarioFormInput,
  type ScenarioFormValues,
} from "./schema.ts";

interface ScenarioFormProps {
  onClose: () => void;
  onSubmit?: (values: ScenarioFormValues) => Promise<void> | void;
}

function getScenarioArrayErrorMessage(errors: FieldErrors<ScenarioFormInput>) {
  const scenarioErrors = errors.scenarios;

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

export function ScenarioForm({ onClose, onSubmit }: ScenarioFormProps) {
  const modalTitleId = useId();
  const form = useForm<ScenarioFormInput, unknown, ScenarioFormValues>({
    resolver: zodResolver(scenarioFormSchema),
    defaultValues: createScenarioDefaults(),
    mode: "onSubmit",
    shouldFocusError: true,
    shouldUnregister: true,
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
  const canAddScenario = scenarioCount < scenarioMaxCount;
  const arrayErrorMessage = getScenarioArrayErrorMessage(errors);

  const closeModal = () => {
    reset(createScenarioDefaults());
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
    async (values) => {
      try {
        if (onSubmit) {
          await onSubmit(values);
        } else {
          console.info("Scenario Planner submit", values);
        }
      } catch (error) {
        console.error("Scenario Planner submission failed", error);
        return;
      }
      closeModal();
    },
    (validationErrors) => {
      console.error("Scenario Planner validation failed", validationErrors);
    },
  );

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={closeModal}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.kicker}>
              New Scenarios
            </p>
            <h2 className={styles.title} id={modalTitleId}>
              New What-If Scenario
            </h2>
            <p className={styles.description}>
              Submit 2-5 scenarios against client baseline.
            </p>
          </div>

          <button
            className={styles.closeButton}
            type="button"
            aria-label="Close modal"
            onClick={closeModal}
          >
            <X className={styles.closeIcon} aria-hidden="true" />
          </button>
        </header>

        <form className={styles.form} noValidate onSubmit={submitForm}>
          <div className={styles.scenarioList}>
            {fields.map((field, index) => (
              <div className={styles.scenarioBlock} key={field.id}>
                {index > 0 ? <hr className={styles.divider} /> : null}
                <ScenarioCard index={index} register={register} errors={errors} />
              </div>
            ))}
          </div>

          <StatusFooter
            scenarioCount={scenarioCount}
            arrayErrorMessage={arrayErrorMessage}
            canAddScenario={canAddScenario}
            isSubmitting={isSubmitting}
            onAddScenario={() => {
              if (!canAddScenario) {
                return;
              }

              append(createScenarioEntry());
            }}
            onClose={closeModal}
          />
        </form>
      </section>
    </div>
  );
}
