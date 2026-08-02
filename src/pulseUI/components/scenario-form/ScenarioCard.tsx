import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { incomeTypeOptions } from "./constants.ts";
import type { ScenarioFormInput } from "./schema.ts";

interface ScenarioCardProps {
  index: number;
  register: UseFormRegister<ScenarioFormInput>;
  errors: FieldErrors<ScenarioFormInput>;
}

const fieldShell = "grid gap-1.5";
const labelClass =
  "text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-[var(--pulse-sidebar-muted)]";
const inputClass =
  "min-h-11 w-full rounded-xl border border-[var(--pulse-border)] bg-[var(--pulse-surface)] px-3.5 text-[var(--pulse-ink)] shadow-sm outline-none transition focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--pulse-accent-light)]";
const invalidClass = "[&[aria-invalid=true]]:border-[#d22b2b] [&[aria-invalid=true]]:shadow-[0_0_0_1px_#d22b2b]";

export function ScenarioCard({ index, register, errors }: ScenarioCardProps) {
  const scenarioErrors = errors.scenarios?.[index];

  return (
    <section className="grid gap-4 rounded-[22px] border border-[var(--pulse-border)] bg-[linear-gradient(180deg,_rgb(19_23_31_/_96%),_rgb(15_19_27_/_98%))] p-4 shadow-[0_1px_2px_rgb(0_0_0_/_20%)]">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="m-0 text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-[var(--pulse-sidebar-muted)]">
            Scenario {index + 1}
          </p>
          <h4 className="mt-1 m-0 text-base font-extrabold text-[var(--pulse-ink)]">
            Typed figures for this scenario
          </h4>
        </div>
      </header>

      <div className="grid gap-4">
        <div className={fieldShell} data-invalid={scenarioErrors?.scenarioName ? "true" : undefined}>
          <label className={labelClass} htmlFor={`scenarios.${index}.scenarioName`}>
            Scenario Name
          </label>
          <input
            id={`scenarios.${index}.scenarioName`}
            className={`${inputClass} ${invalidClass}`}
            type="text"
            placeholder="e.g. Take a freelance project"
            aria-invalid={scenarioErrors?.scenarioName ? "true" : undefined}
            {...register(`scenarios.${index}.scenarioName`)}
          />
          {scenarioErrors?.scenarioName ? (
            <p className="m-0 text-[0.85rem] font-semibold leading-6 text-[#d22b2b]" role="alert">
              {scenarioErrors.scenarioName.message}
            </p>
          ) : null}
        </div>

        <div className={fieldShell} data-invalid={scenarioErrors?.description ? "true" : undefined}>
          <label className={labelClass} htmlFor={`scenarios.${index}.description`}>
            Description
          </label>
          <input
            id={`scenarios.${index}.description`}
            className={`${inputClass} ${invalidClass}`}
            type="text"
            placeholder="e.g. Additional $20k freelance income"
            aria-invalid={scenarioErrors?.description ? "true" : undefined}
            {...register(`scenarios.${index}.description`)}
          />
          {scenarioErrors?.description ? (
            <p className="m-0 text-[0.85rem] font-semibold leading-6 text-[#d22b2b]" role="alert">
              {scenarioErrors.description.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div
            className={fieldShell}
            data-invalid={scenarioErrors?.additionalIncome ? "true" : undefined}
          >
            <label className={labelClass} htmlFor={`scenarios.${index}.additionalIncome`}>
              Additional Income
            </label>
            <input
              id={`scenarios.${index}.additionalIncome`}
              className={`${inputClass} ${invalidClass}`}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              aria-invalid={scenarioErrors?.additionalIncome ? "true" : undefined}
              {...register(`scenarios.${index}.additionalIncome`)}
            />
            {scenarioErrors?.additionalIncome ? (
              <p className="m-0 text-[0.85rem] font-semibold leading-6 text-[#d22b2b]" role="alert">
                {scenarioErrors.additionalIncome.message}
              </p>
            ) : null}
          </div>

          <div
            className={fieldShell}
            data-invalid={scenarioErrors?.additionalDeductions ? "true" : undefined}
          >
            <label className={labelClass} htmlFor={`scenarios.${index}.additionalDeductions`}>
              Additional Deductions
            </label>
            <input
              id={`scenarios.${index}.additionalDeductions`}
              className={`${inputClass} ${invalidClass}`}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              aria-invalid={scenarioErrors?.additionalDeductions ? "true" : undefined}
              {...register(`scenarios.${index}.additionalDeductions`)}
            />
            {scenarioErrors?.additionalDeductions ? (
              <p className="m-0 text-[0.85rem] font-semibold leading-6 text-[#d22b2b]" role="alert">
                {scenarioErrors.additionalDeductions.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className={fieldShell} data-invalid={scenarioErrors?.incomeType ? "true" : undefined}>
          <label className={labelClass} htmlFor={`scenarios.${index}.incomeType`}>
            Income Type
          </label>
          <select
            id={`scenarios.${index}.incomeType`}
            className={`${inputClass} ${invalidClass}`}
            aria-invalid={scenarioErrors?.incomeType ? "true" : undefined}
            {...register(`scenarios.${index}.incomeType`)}
          >
            {incomeTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {scenarioErrors?.incomeType ? (
            <p className="m-0 text-[0.85rem] font-semibold leading-6 text-[#d22b2b]" role="alert">
              {scenarioErrors.incomeType.message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
