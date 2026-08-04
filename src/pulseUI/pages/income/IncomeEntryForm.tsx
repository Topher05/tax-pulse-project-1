import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect, useId } from "react";
import { useForm, type DefaultValues } from "react-hook-form";

import {
  incomeEntrySchema,
  type IncomeCreatePayload,
  type IncomeEntryFormInput,
} from "./incomeEntrySchema.ts";

const defaultValues: DefaultValues<IncomeEntryFormInput> = {
  source: "",
  type: "w2",
  amount: undefined,
  withholding: undefined,
};

const incomeTypeOptions = [
  { label: "W-2 Employment", value: "w2" },
  { label: "1099 Freelance", value: "1099" },
  { label: "Capital Gains", value: "capital-gains" },
  { label: "Rental Income", value: "rental" },
  { label: "Other", value: "other" },
] as const;

export interface IncomeEntryFormProps {
  onClose: () => void;
  onCreate: (payload: IncomeCreatePayload) => void | Promise<void>;
}

export function IncomeEntryForm({ onClose, onCreate }: IncomeEntryFormProps) {
  const formId = useId();
  const form = useForm<IncomeEntryFormInput, unknown, IncomeCreatePayload>({
    resolver: zodResolver(incomeEntrySchema),
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

  const closeForm = () => {
    reset(defaultValues);
    onClose();
  };

  const submitForm = handleSubmit(async (payload) => {
    await onCreate(payload);
    closeForm();
  });

  return (
    <div className="modalOverlay" role="presentation" onClick={closeForm}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header>
          <h2 id={`${formId}-title`}>Add Income</h2>
          <button type="button" aria-label="Close Add Income form" onClick={closeForm}>
            <X aria-hidden="true" />
          </button>
        </header>

        <form noValidate onSubmit={submitForm}>
          <div>
            <label htmlFor={`${formId}-source`}>Source</label>
            <input
              id={`${formId}-source`}
              type="text"
              placeholder="e.g. Acme Corporation"
              aria-invalid={errors.source ? "true" : undefined}
              aria-describedby={errors.source ? `${formId}-source-error` : undefined}
              {...register("source")}
            />
            {errors.source ? (
              <p id={`${formId}-source-error`} role="alert">
                {errors.source.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor={`${formId}-type`}>Type</label>
            <select
              id={`${formId}-type`}
              aria-invalid={errors.type ? "true" : undefined}
              aria-describedby={errors.type ? `${formId}-type-error` : undefined}
              {...register("type")}
            >
              {incomeTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.type ? (
              <p id={`${formId}-type-error`} role="alert">
                {errors.type.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor={`${formId}-amount`}>Amount</label>
            <input
              id={`${formId}-amount`}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              aria-invalid={errors.amount ? "true" : undefined}
              aria-describedby={errors.amount ? `${formId}-amount-error` : undefined}
              {...register("amount")}
            />
            {errors.amount ? (
              <p id={`${formId}-amount-error`} role="alert">
                {errors.amount.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor={`${formId}-withholding`}>Withholding</label>
            <input
              id={`${formId}-withholding`}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              aria-invalid={errors.withholding ? "true" : undefined}
              aria-describedby={
                errors.withholding ? `${formId}-withholding-error` : undefined
              }
              {...register("withholding")}
            />
            {errors.withholding ? (
              <p id={`${formId}-withholding-error`} role="alert">
                {errors.withholding.message}
              </p>
            ) : null}
          </div>

          <footer>
            <button type="button" onClick={closeForm}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}>
              Add Income
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
