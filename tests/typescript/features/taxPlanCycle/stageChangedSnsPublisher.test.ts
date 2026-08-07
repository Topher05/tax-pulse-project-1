import { describe, expect, test, vi } from "vitest";

import {
  createSnsStageChangedEventPublisher,
  createStageChangedCloudEventV1,
  getStageChangedTopicArnFromEnv,
  PublishCommand,
  stageChangedCloudEventSchemaV1,
} from "../../../../src/typescript/index.js";

const transitionInput = {
  tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e81",
  caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e82",
  fromStage: "Intake" as const,
  toStage: "Data Aggregation" as const,
  actor: "advisor-131",
};

describe("stage-changed SNS publisher", () => {
  test("builds a cloud events v1 stage-changed event from the SCRUM-130 contract", () => {
    const event = createStageChangedCloudEventV1(transitionInput, {
      idFactory: () => "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e83",
      now: () => new Date("2026-07-01T14:00:00.000Z"),
    });

    expect(stageChangedCloudEventSchemaV1.parse(event)).toEqual({
      specversion: "1.0",
      id: "stage-transition-018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e83",
      source: "taxpulse.platform.tax-plan-cycle",
      type: "com.taxpulse.tax_plan_cycle.stage_changed.v1",
      time: "2026-07-01T14:00:00.000Z",
      datacontenttype: "application/json",
      dataschema: "taxpulse://schemas/platform/stage-changed/v1",
      data: {
        case_id: transitionInput.caseId,
        tenant_id: transitionInput.tenantId,
        from_stage: "Intake",
        to_stage: "Data Aggregation",
        actor: "advisor-131",
      },
    });
  });

  test("publishes exactly one schema-valid event to the configured SNS topic", async () => {
    const send = vi.fn(async (_command: PublishCommand) => ({}));
    const publisher = createSnsStageChangedEventPublisher(
      { send },
      "arn:aws:sns:us-east-1:123456789012:taxpulse-stage-changed",
      {
        idFactory: () => "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e83",
        now: () => new Date("2026-07-01T14:00:00.000Z"),
      },
    );

    await publisher.publishStageChanged(transitionInput);

    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(PublishCommand);
    expect(command?.input.TopicArn).toBe(
      "arn:aws:sns:us-east-1:123456789012:taxpulse-stage-changed",
    );
    const message = JSON.parse(String(command?.input.Message)) as unknown;

    expect(stageChangedCloudEventSchemaV1.parse(message)).toMatchObject({
      data: {
        case_id: transitionInput.caseId,
        tenant_id: transitionInput.tenantId,
        from_stage: "Intake",
        to_stage: "Data Aggregation",
        actor: "advisor-131",
      },
    });
  });

  test("rejects missing topic configuration", () => {
    expect(() =>
      getStageChangedTopicArnFromEnv({
        TAXPULSE_STAGE_CHANGED_TOPIC_ARN: "   ",
      }),
    ).toThrow("TAXPULSE_STAGE_CHANGED_TOPIC_ARN is required");
  });
});
