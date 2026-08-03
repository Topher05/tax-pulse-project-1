import { describe, expect, test } from "vitest";

import {
  buildCloudTapEvent,
  runCloudTap,
} from "../../../../src/typescript/shared/scripts/cloudTap.js";
import {
  stageChangedCloudEventSchemaV1,
  stageChangedEventDataSchema,
  stageChangedEventSource,
  stageChangedEventType,
} from "../../../../src/typescript/features/taxPlanCycle/index.js";

describe("cloud tap script", () => {
  test("builds a canonical stage-changed CloudEvent fixture", () => {
    const event = buildCloudTapEvent();

    expect(event).toEqual(
      stageChangedCloudEventSchemaV1.parse({
        specversion: "1.0",
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e94",
        source: stageChangedEventSource,
        type: stageChangedEventType,
        time: "2026-08-03T12:00:00.000Z",
        datacontenttype: "application/json",
        dataschema: stageChangedEventDataSchema,
        data: {
          tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
          case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e92",
          from_stage: "Modeling",
          to_stage: "Review",
          actor: "cloud-tap-advisor",
        },
      }),
    );
  });

  test("processes the same event once and skips the duplicate delivery", async () => {
    const result = await runCloudTap("");

    expect(result.mode).toBe("memory");
    expect(result.firstStatus).toBe("processed");
    expect(result.secondStatus).toBe("duplicate");
    expect(result.projectionWrites).toBe(1);
  });
});
