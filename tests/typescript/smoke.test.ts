import assert from "node:assert/strict";
import test from "node:test";

import { createGreeting } from "../../src/typescript/index.js";

test("createGreeting returns the TypeScript smoke message", () => {
  assert.equal(createGreeting(), "hello from TypeScript");
});
