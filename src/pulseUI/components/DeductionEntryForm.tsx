import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect, useId } from "react";
import { useForm, type DefaultValues } from "react-hook-form";
import { z } from "zod";

import styles from "./DeductionEntryForm.module.css";

const deductionCategories = [
  "Business Expense",
  "Home Office",
  "Charitable Giving",
  "Health & Medical",
  "Education",
  "Retirement Contribution",
  "Other",
] as const;

const deductionEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required"),
  category: z.enum(deductionCategories),
  description: z.string().trim().min(1, "Description is required"),
  amount: z.preprocess(
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
    z.number({
        error: (issue) =>
          issue.input === undefined ? "Amount is required" : "Amount must be a number",
      }).finite()
      .min(0, { message: "Amount cannot be negative" }),
  ),
});

type DeductionEntryFormInput = z.input<typeof deductionEntrySchema>;
type DeductionEntryFormValues = z.output<typeof deductionEntrySchema>;

const defaultValues: DefaultValues<DeductionEntryFormInput> = {
  date: "",
  category: "Business Expense",
  description: "",
  amount: undefined,
};

interface DeductionEntryFormProps {
  onClose: () => void;
}

export function DeductionEntryForm({ onClose }: DeductionEntryFormProps) {
  const modalTitleId = useId();
  const form = useForm<DeductionEntryFormInput, unknown, DeductionEntryFormValues>({
    resolver: zodResolver(deductionEntrySchema),
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
  const hasValidationErrors = Object.keys(errors).length > 0;

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
      console.table(values);
      closeModal();
    },
    (validationErrors) => {
      console.error("Deduction entry validation failed", validationErrors);
    },
  );

  return (
    <div className="modalOverlay" role="presentation" onClick={closeModal}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className={styles.header}>
          <h2 className={styles.title} id={modalTitleId}>
            New Deduction
          </h2>

          <button
            className={styles.iconButton}
            type="button"
            aria-label="Close modal"
            onClick={closeModal}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <form className={styles.form} noValidate onSubmit={submitForm}>
          <div className={styles.field} data-invalid={errors.date ? "true" : undefined}>
            <label className={styles.label} htmlFor="deductionDate">
              Date
            </label>
            <input
              id="deductionDate"
              aria-invalid={errors.date ? "true" : undefined}
              className={styles.input}
              type="date"
              {...register("date")}
            />
            {errors.date ? (
              <p className={styles.error} role="alert">
                {errors.date.message}
              </p>
            ) : null}
          </div>

          <div className={styles.field} data-invalid={errors.category ? "true" : undefined}>
            <label className={styles.label} htmlFor="deductionCategory">
              Category
            </label>
            <select
              id="deductionCategory"
              aria-invalid={errors.category ? "true" : undefined}
              className={styles.select}
              {...register("category")}
            >
              {deductionCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category ? (
              <p className={styles.error} role="alert">
                {errors.category.message}
              </p>
            ) : null}
          </div>

          <div className={styles.field} data-invalid={errors.description ? "true" : undefined}>
            <label className={styles.label} htmlFor="deductionDescription">
              Description
            </label>
            <input
              id="deductionDescription"
              aria-invalid={errors.description ? "true" : undefined}
              className={styles.input}
              type="text"
              placeholder="e.g. Home office desk and chair"
              {...register("description")}
            />
            {errors.description ? (
              <p className={styles.error} role="alert">
                {errors.description.message}
              </p>
            ) : null}
          </div>

          <div className={styles.field} data-invalid={errors.amount ? "true" : undefined}>
            <label className={styles.label} htmlFor="deductionAmount">
              Amount
            </label>
            <input
              id="deductionAmount"
              aria-invalid={errors.amount ? "true" : undefined}
              className={styles.input}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              {...register("amount")}
            />
            {errors.amount ? (
              <p className={styles.error} role="alert">
                {errors.amount.message}
              </p>
            ) : null}
          </div>

          <footer className={styles.actions}>
            <button className={styles.secondaryButton} type="button" onClick={closeModal}>
              Cancel
            </button>
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={isSubmitting || hasValidationErrors}
            >
              Create Deduction
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
