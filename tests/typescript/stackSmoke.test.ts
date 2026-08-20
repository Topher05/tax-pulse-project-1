import { describe, expect, test } from "vitest";

import {
  buildStackSmokeConnectionFailureMessage,
  buildStackSmokeEmail,
} from "../../src/typescript/shared/scripts/stackSmoke.js";

describe("stack smoke helpers", () => {
  test("builds a synthetic unique registration email", () => {
    expect(
      buildStackSmokeEmail(() => new Date("2026-08-11T16:30:45.123Z")),
    ).toBe("compose-smoke-20260811163045123@example.com");
  });

  test("formats the container connection failure after five attempts", () => {
    expect(
      buildStackSmokeConnectionFailureMessage(
        "Core Case Service health",
        5,
        "fetch failed",
      ),
    ).toBe(
      "Core Case Service health failed to connect container after 5 attempts: fetch failed",
    );
  });
});
