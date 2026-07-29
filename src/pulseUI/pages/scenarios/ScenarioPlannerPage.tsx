import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { useForm, type DefaultValues } from "react-hook-form";
import { z } from "zod";

import styles from "./ScenarioPlannerPage.module.css";

const incomeTypeOptions = [
  { value: "rt", label: "Rental" },
  { value: "cg", label: "Capital Gains" },
  { value: "se", label: "1099/Self-Employment" },
  { value: "w2", label: "W-2 Employment" },
] as const;

const scenarioPlannerSchema = z.object({
  scenarioName: z.string().trim().min(1, "Scenario Name is required"),
  description: z.string().trim().min(1, "Description is required"),
  additionalIncome: z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();

        if (trimmed.length === 0) {
          return undefined;
        }

        return Number(trimmed);
      }

      return value;
    },
    z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? "Additional Income is required"
            : "Additional Income must be a number",
      })
      .finite()
      .min(0, { message: "Additional Income cannot be negative" }),
  ),
  additionalDeductions: z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();

        if (trimmed.length === 0) {
          return undefined;
        }

        return Number(trimmed);
      }

      return value;
    },
    z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? "Additional Deductions is required"
            : "Additional Deductions must be a number",
      })
      .finite()
      .min(0, { message: "Additional Deductions cannot be negative" }),
  ),
  incomeType: z.enum(["rt", "cg", "se", "w2"]).default("w2"),
});

type ScenarioPlannerFormInput = z.input<typeof scenarioPlannerSchema>;
type ScenarioPlannerFormValues = z.output<typeof scenarioPlannerSchema>;

const defaultValues: DefaultValues<ScenarioPlannerFormInput> = {
  scenarioName: "",
  description: "",
  additionalIncome: undefined,
  additionalDeductions: undefined,
  incomeType: "w2",
};

interface ScenarioPlannerModalProps {
  onClose: () => void;
}

function ScenarioPlannerModal({ onClose }: ScenarioPlannerModalProps) {
  const modalTitleId = useId();
  const form = useForm<ScenarioPlannerFormInput, unknown, ScenarioPlannerFormValues>({
    resolver: zodResolver(scenarioPlannerSchema),
    defaultValues,
    mode: "onSubmit",
    shouldFocusError: true,
  });

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = form;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const closeModal = () => {
    reset(defaultValues);
    onClose();
  };

  const submitForm = handleSubmit(
    (values) => {
      // TODO Submission work is handled in Scrum-102.
      console.table(values);
      closeModal();
    },
    (validationErrors) => {
      console.error("Scenario Planner validation failed", validationErrors);
    },
  );

  return (
    <div className={styles.overlay} role="presentation" onClick={closeModal}>
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
          <div className={styles.headingGroup}>
            <p className={styles.kicker}>What-if modeling</p>
            <h2 className={styles.title} id={modalTitleId}>
              New What-If Scenario
            </h2>
          </div>

          <button className={styles.iconButton} type="button" aria-label="Close modal" onClick={closeModal}>
            <X aria-hidden="true" />
          </button>
        </header>

        <form className={styles.form} noValidate onSubmit={submitForm}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="scenarioName">
              Scenario Name
            </label>
            <input
              id="scenarioName"
              className={styles.input}
              type="text"
              placeholder="e.g. Take a freelance project"
              {...register("scenarioName")}
            />
            {errors.scenarioName ? (
              <p className={styles.error} role="alert">
                {errors.scenarioName.message}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="description">
              Description
            </label>
            <input
              id="description"
              className={styles.input}
              type="text"
              placeholder="e.g. Additional $20k freelance income"
              {...register("description")}
            />
            {errors.description ? (
              <p className={styles.error} role="alert">
                {errors.description.message}
              </p>
            ) : null}
          </div>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="additionalIncome">
                Additional Income
              </label>
              <input
                id="additionalIncome"
                className={styles.input}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                {...register("additionalIncome")}
              />
              {errors.additionalIncome ? (
                <p className={styles.error} role="alert">
                  {errors.additionalIncome.message}
                </p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="additionalDeductions">
                Additional Deductions
              </label>
              <input
                id="additionalDeductions"
                className={styles.input}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                {...register("additionalDeductions")}
              />
              {errors.additionalDeductions ? (
                <p className={styles.error} role="alert">
                  {errors.additionalDeductions.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="incomeType">
              Income Type
            </label>
            <select id="incomeType" className={styles.select} {...register("incomeType")}>
              {incomeTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.incomeType ? (
              <p className={styles.error} role="alert">
                {errors.incomeType.message}
              </p>
            ) : null}
          </div>

          <footer className={styles.actions}>
            <button className={styles.secondaryButton} type="button" onClick={closeModal}>
              Cancel
            </button>
            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              Create Scenario
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

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
          New What-If Scenario
        </button>
      </div>

      {isModalOpen ? <ScenarioPlannerModal onClose={() => setIsModalOpen(false)} /> : null}
    </section>
  );
}
