import { describe, expect, test } from "vitest";

import {
  buildCloudTapEvent,
  buildCloudTapSnsNotificationEnvelope,
  runCloudTap,
  runPresentToClientCloudTap,
} from "../../../../src/typescript/shared/scripts/cloudTap.js";
import {
  actionItemCreatedCloudEventSchemaV1,
  actionItemCreatedEventDataSchema,
  actionItemCreatedEventSource,
  actionItemCreatedEventType,
  stageChangedCloudEventSchemaV1,
  stageChangedEventDataSchema,
  stageChangedEventSource,
  stageChangedEventType,
} from "../../../../src/typescript/features/taxPlanCycle/index.js";

describe("cloud tap script", () => {
  function createInMemoryRedisClient() {
    const store = new Map<string, string>();

    return {
      store,
      async get(key: string): Promise<string | null> {
        return store.get(key) ?? null;
      },
      async set(
        key: string,
        value: string,
        options?: { EX?: number; NX?: boolean },
      ): Promise<"OK" | null> {
        if (options?.NX && store.has(key)) {
          return null;
        }

        store.set(key, value);
        return "OK";
      },
      async del(key: string): Promise<number> {
        return store.delete(key) ? 1 : 0;
      },
    };
  }

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
    const redisClient = createInMemoryRedisClient();
    const result = await runCloudTap(undefined, {
      redisClient,
      queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/taxpulse-stage-changed",
    });

    expect(result.mode).toBe("redis");
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
    expect(result.actionItemEvent).toEqual(
      actionItemCreatedCloudEventSchemaV1.parse({
        specversion: "1.0",
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e95",
        source: actionItemCreatedEventSource,
        type: actionItemCreatedEventType,
        time: "2026-08-04T15:00:00.000Z",
        datacontenttype: "application/json",
        dataschema: actionItemCreatedEventDataSchema,
        data: {
          tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
          case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e92",
          description: "Send the client action-item checklist",
          deadline: "2026-08-21",
          completed: false,
          actor: "cloud-tap-advisor",
        },
      }),
    );
    expect(result.actionItemIdempotencyKey).toBe(
      "idem:queue-projection:018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91:tax-plan-cycle-action-item-created:018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e95",
    );
    expect(result.actionItemFirstResult).toEqual({
      status: "processed",
      item: {
        id: 1,
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e92",
        description: "Send the client action-item checklist",
        deadline: "2026-08-21",
        completed: false,
      },
    });
    expect(result.actionItemSecondResult).toEqual({
      status: "duplicate",
    });
    expect(result.actionItemProjectionWrites).toBe(1);
    expect(result.presentToClient.success.finalStage).toBe("Client Approval");
    expect(result.presentToClient.success.rollbackCount).toBe(0);
    expect(result.presentToClient.compensation.finalStage).toBe("Review");
    expect(result.presentToClient.compensation.rollbackCount).toBe(1);

    expect(Array.from(redisClient.store.keys())).toEqual(
      expect.arrayContaining([
        "cloudtap:present-to-client:success:forward-stage-changed",
        "cloudtap:present-to-client:success:action-item-created",
        "cloudtap:present-to-client:success:result",
        "cloudtap:present-to-client:compensation:forward-stage-changed",
        "cloudtap:present-to-client:compensation:action-item-created",
        "cloudtap:present-to-client:compensation:compensating-stage-changed",
        "cloudtap:present-to-client:compensation:result",
      ]),
    );
    expect(
      redisClient.store.get("cloudtap:present-to-client:compensation:result"),
    ).toContain('"finalStage": "Review"');
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
