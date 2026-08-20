import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const workflowPath = resolve(process.cwd(), ".github/workflows/container-build-scaffold.yml");

describe("Container build scaffold workflow", () => {
  test("documents the Blacksmith Docker helper actions for future container work", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("useblacksmith/setup-docker-builder@v1");
    expect(workflow).toContain("useblacksmith/build-push-action@v2");
    expect(workflow).toContain(
      "TODO: CL, added runtime docker build optimization config, should help with container setup when that item is worked on",
    );
    expect(workflow).toContain("Container build scaffold only; no image is built in SCRUM-163.");
  });
});
