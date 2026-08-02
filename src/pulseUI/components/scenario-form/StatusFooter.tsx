import { Plus } from "lucide-react";

import { scenarioMaxCount, scenarioMinCount } from "./constants.ts";

interface StatusFooterProps {
  scenarioCount: number;
  arrayErrorMessage?: string | null;
  canAddScenario: boolean;
  isSubmitting: boolean;
  onAddScenario: () => void;
  onClose: () => void;
}

function describeSlots(scenarioCount: number) {
  if (scenarioCount >= scenarioMaxCount) {
    return "0 scenario slots left, Maximum allowed scenarios";
  }

  const slotsLeft = scenarioMaxCount - scenarioCount;

  if (scenarioCount >= scenarioMinCount) {
    return `${slotsLeft} ${slotsLeft === 1 ? "scenario slot left" : "scenario slots left"}`;
  }

  const additionalRequired = scenarioMinCount - scenarioCount;

  return `${slotsLeft} ${slotsLeft === 1 ? "scenario slot left" : "scenario slots left"} ${additionalRequired} ${additionalRequired === 1 ? "additional scenario required" : "additional scenarios required"}`;
}

export function StatusFooter({
  scenarioCount,
  arrayErrorMessage,
  canAddScenario,
  isSubmitting,
  onAddScenario,
  onClose,
}: StatusFooterProps) {
  return (
    <footer className="grid gap-4 pt-1">
      <div className="grid gap-1.5">
        {arrayErrorMessage ? (
          <p className="m-0 text-[0.9rem] font-semibold leading-6 text-[#d22b2b]" role="alert">
            {arrayErrorMessage}
          </p>
        ) : null}
        <p className="m-0 text-[0.92rem] leading-6 text-[var(--pulse-muted)]">
          {describeSlots(scenarioCount)}
        </p>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--pulse-border)] bg-[var(--pulse-surface-subtle)] px-4 font-bold text-[var(--pulse-ink)] transition hover:bg-[var(--pulse-surface-muted)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--pulse-accent-light)]"
          type="button"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--pulse-border)] bg-[var(--pulse-surface-subtle)] px-4 font-bold text-[var(--pulse-ink)] transition hover:bg-[var(--pulse-surface-muted)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--pulse-accent-light)]"
          type="button"
          onClick={onAddScenario}
          disabled={!canAddScenario}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add additional scenario
        </button>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--pulse-accent)] px-4 font-extrabold text-[#f8fafc] shadow-[0_10px_25px_rgb(99_102_241_/_24%)] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--pulse-accent-light)]"
          type="submit"
          disabled={isSubmitting}
        >
          Create Scenario
        </button>
      </div>
    </footer>
  );
}

