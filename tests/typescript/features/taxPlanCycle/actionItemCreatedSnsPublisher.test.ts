import { describe, expect, test, vi } from "vitest";

import {
  PublishCommand,
  createActionItemCreatedCloudEvent,
  createSnsActionItemCreatedEventPublisher,
  actionItemCreatedCloudEventSchemaV1,
} from "../../../../src/typescript/index.js";

const actionItemInput = {
  tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e81",
  caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e82",
  actor: "advisor-138",
  description: "Send the client presentation packet",
  deadline: "2026-08-14",
};

describe("action-item-created SNS publisher", () => {
  test("builds a CloudEvents v1 action-item event from the SCRUM-138 contract", () => {
    const event = createActionItemCreatedCloudEvent(actionItemInput, {
      idFactory: () => "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e83",
      now: () => new Date("2026-07-01T14:00:00.000Z"),
    });

    expect(actionItemCreatedCloudEventSchemaV1.parse(event)).toEqual({
      specversion: "1.0",
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e83",
      source: "taxpulse.platform.tax-plan-cycle",
      type: "com.taxpulse.tax_plan_cycle.action_item_created.v1",
      time: "2026-07-01T14:00:00.000Z",
      datacontenttype: "application/json",
      dataschema: "taxpulse://schemas/platform/action-item-created/v1",
      data: {
        case_id: actionItemInput.caseId,
        tenant_id: actionItemInput.tenantId,
        description: actionItemInput.description,
        deadline: actionItemInput.deadline,
        completed: false,
        actor: actionItemInput.actor,
      },
    });
  });

  test("publishes exactly one schema-valid action-item event to the configured SNS topic", async () => {
    const send = vi.fn(async (_command: PublishCommand) => ({}));
    const publisher = createSnsActionItemCreatedEventPublisher(
      { send },
      "arn:aws:sns:us-east-1:123456789012:taxpulse-action-item-created.fifo",
      {
        idFactory: () => "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e83",
        now: () => new Date("2026-07-01T14:00:00.000Z"),
      },
    );

    await publisher.publishActionItemCreated(actionItemInput);

    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(PublishCommand);
    expect(command?.input.TopicArn).toBe(
      "arn:aws:sns:us-east-1:123456789012:taxpulse-action-item-created.fifo",
    );
    expect(command?.input.MessageGroupId).toBe(actionItemInput.caseId);
    expect(command?.input.MessageDeduplicationId).toBe(
      "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e83",
    );
    const message = JSON.parse(String(command?.input.Message)) as unknown;

    expect(actionItemCreatedCloudEventSchemaV1.parse(message)).toMatchObject({
      data: {
        case_id: actionItemInput.caseId,
        tenant_id: actionItemInput.tenantId,
        description: actionItemInput.description,
        deadline: actionItemInput.deadline,
        completed: false,
        actor: actionItemInput.actor,
      },
    });
  });
});
