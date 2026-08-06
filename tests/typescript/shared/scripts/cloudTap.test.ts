import { describe, expect, test } from "vitest";

import {
  buildCloudTapEvent,
  buildCloudTapSnsNotificationEnvelope,
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
        id: "stage-transition-018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e94",
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

  test("wraps the canonical event in an SNS notification envelope", () => {
    const envelope = JSON.parse(
      buildCloudTapSnsNotificationEnvelope(buildCloudTapEvent()),
    ) as {
      Type: string;
      Message: string;
      TopicArn: string;
    };

    expect(envelope.Type).toBe("Notification");
    expect(envelope.TopicArn).toBe(
      "arn:aws:sns:us-east-1:123456789012:taxpulse-stage-changed",
    );
    expect(
      stageChangedCloudEventSchemaV1.parse(JSON.parse(envelope.Message)),
    ).toEqual(buildCloudTapEvent());
  });

  test("processes the synthetic event through the real SQS consumer path", async () => {
    const result = await runCloudTap();

    expect(result.mode).toBe("memory");
    expect(result.queueUrl).toBe(
      "https://sqs.us-east-1.amazonaws.com/123456789012/taxpulse-stage-changed",
    );
    expect(result.idempotencyKey).toBe(
      "idem:queue-projection:018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91:tax-plan-cycle-stage-changed:stage-transition-018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e94",
    );
    expect(result.firstResult).toEqual({
      received: 1,
      processed: 1,
      duplicate: 0,
      failed: 0,
    });
    expect(result.secondResult).toEqual({
      received: 1,
      processed: 0,
      duplicate: 1,
      failed: 0,
    });
    expect(result.projectionWrites).toBe(1);
    expect(result.sentCommands).toEqual(["receive", "delete", "receive", "delete"]);
    expect(result.infoLogs).toHaveLength(2);
    expect(result.infoLogs[0]).toEqual({
      bindings: {
        event_id: "stage-transition-018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e94",
        tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e92",
        from_stage: "Modeling",
        to_stage: "Review",
        actor: "cloud-tap-advisor",
      },
      message: "Received stage-changed event from SQS",
    });
    expect(result.infoLogs[1]).toEqual({
      bindings: {
        event_id: "stage-transition-018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e94",
        tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e92",
        from_stage: "Modeling",
        to_stage: "Review",
        actor: "cloud-tap-advisor",
      },
      message: "Skipped duplicate stage-changed event from SQS",
    });
    expect(result.warnLogs).toEqual([]);
  });
});
