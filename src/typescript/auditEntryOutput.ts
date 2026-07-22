import { z } from "zod";

export const redactedAuditAmount = "[REDACTED_AMOUNT]";

const dollarAmountPattern = /\$\s*[-+]?\d[\d,]*(?:\.\d+)?/g;
const financialLabelPattern =
  "(?:taxable\\s+income|gross\\s+income|tax\\s+impact|estimated\\s+tax|income|deduction|deductions|withholding|tax|amount|payment|payments|revenue|refund)";
const numericAmountPattern =
  "[-+]?(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?";
const financialAmountAfterLabelPattern = new RegExp(
  `\\b(${financialLabelPattern})([^\\n\\r\\d$]{0,32})(${numericAmountPattern})\\b`,
  "gi",
);
const financialAmountBeforeLabelPattern = new RegExp(
  `\\b(${numericAmountPattern})([^\\n\\r\\d$]{0,16})(${financialLabelPattern})\\b`,
  "gi",
);

export const auditEntryOutputSchema = z.object({
  id: z.uuid(),
  case_id: z.uuid(),
  actor: z.string(),
  action: z.string(),
  outcome: z.string(),
  occurred_at: z.string(),
});

export type AuditEntryOutput = z.infer<typeof auditEntryOutputSchema>;

export interface StoredAuditEntry {
  id: string;
  caseId: string;
  actor: string;
  action: string;
  outcome: string;
  occurredAt: Date;
}

function isLikelyIdentifierOrDate(text: string, start: number, end: number): boolean {
  const previous = text[start - 1] ?? "";
  const next = text[end] ?? "";
  const value = text.slice(start, end);

  if (previous === "-" || next === "-") {
    return true;
  }

  if (/^\d{4}$/.test(value) && /(?:^|\D)(?:19|20)\d{2}(?:\D|$)/.test(value)) {
    return true;
  }

  return false;
}

export function redactAuditText(text: string): string {
  const dollarRedacted = text.replace(dollarAmountPattern, redactedAuditAmount);

  return dollarRedacted
    .replace(
      financialAmountAfterLabelPattern,
      (match, label: string, separator: string, amount: string, offset: number) => {
        const amountStart = offset + label.length + separator.length;
        const amountEnd = amountStart + amount.length;

        if (isLikelyIdentifierOrDate(dollarRedacted, amountStart, amountEnd)) {
          return match;
        }

        return `${label}${separator}${redactedAuditAmount}`;
      },
    )
    .replace(
      financialAmountBeforeLabelPattern,
      (match, amount: string, separator: string, label: string, offset: number) => {
        const amountEnd = offset + amount.length;

        if (isLikelyIdentifierOrDate(dollarRedacted, offset, amountEnd)) {
          return match;
        }

        return `${redactedAuditAmount}${separator}${label}`;
      },
    );
}

export function serializeAuditEntryForOutput(entry: StoredAuditEntry): AuditEntryOutput {
  return auditEntryOutputSchema.parse({
    id: entry.id,
    case_id: entry.caseId,
    actor: entry.actor,
    action: redactAuditText(entry.action),
    outcome: redactAuditText(entry.outcome),
    occurred_at: entry.occurredAt.toISOString(),
  });
}
