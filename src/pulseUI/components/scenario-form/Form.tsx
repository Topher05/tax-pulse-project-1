import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect, useId } from "react";
import { useFieldArray, useForm, type FieldErrors } from "react-hook-form";

import { createScenarioEntry, scenarioMaxCount } from "./constants.ts";
import { ScenarioCard } from "./ScenarioCard.tsx";
import { StatusFooter } from "./StatusFooter.tsx";
import {
  createScenarioDefaults,
  scenarioFormSchema,
  type ScenarioFormInput,
  type ScenarioFormValues,
} from "./schema.ts";

interface ScenarioFormProps {
  caseId: string;
  onClose: () => void;
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

export function ScenarioForm({ caseId, onClose }: ScenarioFormProps) {
  const modalTitleId = useId();
  const form = useForm<ScenarioFormInput, unknown, ScenarioFormValues>({
    resolver: zodResolver(scenarioFormSchema),
    defaultValues: createScenarioDefaults(),
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
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 py-6 backdrop-blur-md"
      role="presentation"
      onClick={closeModal}
    >
      <section
        className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border border-[var(--pulse-border)] bg-[linear-gradient(180deg,_rgb(18_21_29_/_98%),_rgb(12_15_21_/_98%))] shadow-[0_24px_60px_rgb(0_0_0_/_42%)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-6">
          <div className="grid gap-1.5">
            <p className="m-0 text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-[var(--pulse-sidebar-muted)]">
              New Scenarios
            </p>
            <h2
              className="m-0 text-[1.5rem] font-black leading-tight text-[var(--pulse-ink)]"
              id={modalTitleId}
            >
              New What-If Scenario
            </h2>
            <p className="m-0 text-[var(--pulse-muted)] leading-6">
              Submit 2-5 scenarios against client baseline.
            </p>
          </div>

          <button
            className="inline-grid h-10 w-10 place-items-center rounded-full border border-[var(--pulse-border)] bg-[var(--pulse-surface-subtle)] text-[var(--pulse-muted)] transition hover:bg-[var(--pulse-surface-muted)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--pulse-accent-light)]"
            type="button"
            aria-label="Close modal"
            onClick={closeModal}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <form className="grid max-h-[calc(90vh-90px)] gap-4 overflow-y-auto px-6 pb-6 pt-5" noValidate onSubmit={submitForm}>
          <div className="flex items-baseline justify-between gap-4 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="m-0 text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-[var(--pulse-sidebar-muted)]">
              Case ID
            </p>
            <p className="m-0 truncate text-[0.92rem] font-bold text-[var(--pulse-muted)]">{caseId}</p>
          </div>

          <div className="grid gap-4">
            {fields.map((field, index) => (
              <ScenarioCard key={field.id} index={index} register={register} errors={errors} />
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
