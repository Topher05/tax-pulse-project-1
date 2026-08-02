import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { incomeTypeOptions } from "./constants.ts";
import styles from "./ScenarioCard.module.css";
import type { ScenarioFormInput } from "./schema.ts";

interface ScenarioCardProps {
  index: number;
  register: UseFormRegister<ScenarioFormInput>;
  errors: FieldErrors<ScenarioFormInput>;
}

export function ScenarioCard({ index, register, errors }: ScenarioCardProps) {
  const scenarioErrors = errors.scenarios?.[index];

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>
            Scenario {index + 1}
          </p>
          <h4 className={styles.title}>
            Typed figures for this scenario
          </h4>
        </div>
      </header>

      <div className={styles.fields}>
        <div
          className={styles.field}
          data-invalid={scenarioErrors?.scenarioName ? "true" : undefined}
        >
          <label className={styles.label} htmlFor={`scenarios.${index}.scenarioName`}>
            Scenario Name
          </label>
          <input
            id={`scenarios.${index}.scenarioName`}
            className={styles.input}
            type="text"
            placeholder="e.g. Take a freelance project"
            aria-invalid={scenarioErrors?.scenarioName ? "true" : undefined}
            {...register(`scenarios.${index}.scenarioName`)}
          />
          {scenarioErrors?.scenarioName ? (
            <p className={styles.error} role="alert">
              {scenarioErrors.scenarioName.message}
            </p>
          ) : null}
        </div>

        <div
          className={styles.field}
          data-invalid={scenarioErrors?.description ? "true" : undefined}
        >
          <label className={styles.label} htmlFor={`scenarios.${index}.description`}>
            Description
          </label>
          <input
            id={`scenarios.${index}.description`}
            className={styles.input}
            type="text"
            placeholder="e.g. Additional $20k freelance income"
            aria-invalid={scenarioErrors?.description ? "true" : undefined}
            {...register(`scenarios.${index}.description`)}
          />
          {scenarioErrors?.description ? (
            <p className={styles.error} role="alert">
              {scenarioErrors.description.message}
            </p>
          ) : null}
        </div>

        <div className={styles.amountGrid}>
          <div
            className={styles.field}
            data-invalid={scenarioErrors?.additionalIncome ? "true" : undefined}
          >
            <label className={styles.label} htmlFor={`scenarios.${index}.additionalIncome`}>
              Additional Income
            </label>
            <input
              id={`scenarios.${index}.additionalIncome`}
              className={styles.input}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              aria-invalid={scenarioErrors?.additionalIncome ? "true" : undefined}
              {...register(`scenarios.${index}.additionalIncome`)}
            />
            {scenarioErrors?.additionalIncome ? (
              <p className={styles.error} role="alert">
                {scenarioErrors.additionalIncome.message}
              </p>
            ) : null}
          </div>

          <div
            className={styles.field}
            data-invalid={scenarioErrors?.additionalDeductions ? "true" : undefined}
          >
            <label className={styles.label} htmlFor={`scenarios.${index}.additionalDeductions`}>
              Additional Deductions
            </label>
            <input
              id={`scenarios.${index}.additionalDeductions`}
              className={styles.input}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              aria-invalid={scenarioErrors?.additionalDeductions ? "true" : undefined}
              {...register(`scenarios.${index}.additionalDeductions`)}
            />
            {scenarioErrors?.additionalDeductions ? (
              <p className={styles.error} role="alert">
                {scenarioErrors.additionalDeductions.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.field} data-invalid={scenarioErrors?.incomeType ? "true" : undefined}>
          <label className={styles.label} htmlFor={`scenarios.${index}.incomeType`}>
            Income Type
          </label>
          <select
            id={`scenarios.${index}.incomeType`}
            className={styles.input}
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
            <p className={styles.error} role="alert">
              {scenarioErrors.incomeType.message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
