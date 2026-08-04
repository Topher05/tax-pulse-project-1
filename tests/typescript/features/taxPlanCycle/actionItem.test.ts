import { describe, expect, test } from "vitest";
import { ZodError } from "zod";

import {
  actionItemSchema,
  type ActionItem,
} from "../../../../src/typescript/index.js";

const wellFormedActionItem = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f01",
  case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f02",
  description: "Send the client checklist",
  deadline: "2026-08-21",
  completed: false,
} as const;

describe("actionItemSchema", () => {
  test("parses a well-formed action item row", () => {
    const parsedActionItem: ActionItem = actionItemSchema.parse(
      wellFormedActionItem,
    );

    expect(parsedActionItem).toEqual(wellFormedActionItem);
  });

  test("rejects missing required fields", () => {
    const { deadline: _deadline, ...rowWithoutDeadline } = wellFormedActionItem;

    const result = actionItemSchema.safeParse(rowWithoutDeadline);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
      expect(result.error.issues[0]?.path).toEqual(["deadline"]);
    }
  });
});
