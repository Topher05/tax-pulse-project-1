import { describe, expect, test } from "vitest";

import {
  redactAuditText,
  redactedAuditAmount,
  serializeAuditEntryForOutput,
} from "../../../../src/typescript/index.js";

describe("audit entry output redaction", () => {
  test("redacts dollar-formatted and contextually financial figures", () => {
    const text =
      "Income amount 125000 and deduction amount: 18,500.75 with withholding $1,400";

    const redacted = redactAuditText(text);

    expect(redacted).toBe(
      `Income amount ${redactedAuditAmount} and deduction amount: ${redactedAuditAmount} with withholding ${redactedAuditAmount}`,
    );
    expect(redacted).not.toContain("125000");
    expect(redacted).not.toContain("18,500.75");
    expect(redacted).not.toContain("$1,400");
  });

  test("preserves non-financial identifiers, counts, dates, and stages", () => {
    const text =
      "attempt count 2 for case 018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01 during 2026-Q4 from Modeling to Review before income amount 125000";

    expect(redactAuditText(text)).toBe(
      `attempt count 2 for case 018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01 during 2026-Q4 from Modeling to Review before income amount ${redactedAuditAmount}`,
    );
  });

  test("serializes redacted output without mutating the stored entry", () => {
    const stored = {
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71",
      caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
      actor: "advisor-001",
      action: "income amount 125000 recorded",
      outcome: "deduction amount $18,500 accepted",
      occurredAt: new Date("2026-07-20T14:00:00.000Z"),
    };

    const output = serializeAuditEntryForOutput(stored);

    expect(output).toEqual({
      id: stored.id,
      case_id: stored.caseId,
      actor: stored.actor,
      action: `income amount ${redactedAuditAmount} recorded`,
      outcome: `deduction amount ${redactedAuditAmount} accepted`,
      occurred_at: "2026-07-20T14:00:00.000Z",
    });
    expect(stored.action).toBe("income amount 125000 recorded");
    expect(stored.outcome).toBe("deduction amount $18,500 accepted");
  });
});
