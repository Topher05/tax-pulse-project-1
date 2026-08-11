import { describe, expect, test } from "vitest";

import { buildStackSmokeEmail } from "../../src/typescript/shared/scripts/stackSmoke.js";

describe("stack smoke helpers", () => {
  test("builds a synthetic unique registration email", () => {
    expect(
      buildStackSmokeEmail(() => new Date("2026-08-11T16:30:45.123Z")),
    ).toBe("compose-smoke-20260811163045123@example.com");
  });
});
