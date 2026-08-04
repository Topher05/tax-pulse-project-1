import { describe, expect, test } from "vitest";

import {
  buildCloudTapEvent,
  runCloudTap,
  runPresentToClientCloudTap,
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

  test("proves the present-to-client success and compensation paths in memory", async () => {
    const result = await runPresentToClientCloudTap();

    expect(result.success.finalStage).toBe("Client Approval");
    expect(result.success.actionItemStatus).toBe("processed");
    expect(result.success.rollbackCount).toBe(0);
    expect(result.success.stageChangedEvents).toBe(1);

    expect(result.compensation.finalStage).toBe("Review");
    expect(result.compensation.actionItemStatus).toBe("failed");
    expect(result.compensation.rollbackCount).toBe(1);
    expect(result.compensation.stageChangedEvents).toBe(2);
  });

  test("writes Redis-visible trace keys for manual present-to-client verification", async () => {
    const writes: Array<{ key: string; value: string }> = [];
    const traceWriter = {
      async set(key: string, value: string): Promise<unknown> {
        writes.push({ key, value });
        return "OK";
      },
    };

    await runPresentToClientCloudTap(traceWriter);

    expect(writes.map((entry) => entry.key)).toEqual([
      "cloudtap:present-to-client:success:forward-stage-changed",
      "cloudtap:present-to-client:success:action-item-created",
      "cloudtap:present-to-client:success:result",
      "cloudtap:present-to-client:compensation:forward-stage-changed",
      "cloudtap:present-to-client:compensation:action-item-created",
      "cloudtap:present-to-client:compensation:compensating-stage-changed",
      "cloudtap:present-to-client:compensation:result",
    ]);

    expect(writes[0]?.value).toContain('"toStage": "Client Approval"');
    expect(writes[2]?.value).toContain('"finalStage": "Client Approval"');
    expect(writes[5]?.value).toContain('"toStage": "Review"');
    expect(writes[6]?.value).toContain('"finalStage": "Review"');
  });
});
