import { describe, expect, test, vi } from "vitest";

import {
  createPresentToClientLambdaRuntime,
} from "../../../../src/typescript/shared/scripts/present-to-client-lambda/runtime.js";
import {
  PublishCommand,
  actionItemCreatedCloudEventSchemaV1,
  stageChangedCloudEventSchemaV1,
} from "../../../../src/typescript/index.js";

describe("present-to-client Lambda runtime", () => {
  test("publishes stage-changed and action-item-created events through SNS", async () => {
    const stageChangedCommands: PublishCommand[] = [];
    const actionItemCommands: PublishCommand[] = [];
    const stageChangedSend = vi.fn(async (command: PublishCommand) => {
      stageChangedCommands.push(command);
      return {};
    });
    const actionItemSend = vi.fn(async (command: PublishCommand) => {
      actionItemCommands.push(command);
      return {};
    });
    const runtime = await createPresentToClientLambdaRuntime({
      env: {
        AWS_REGION: "us-east-1",
        TAXPULSE_STAGE_CHANGED_TOPIC_ARN:
          "arn:aws:sns:us-east-1:123456789012:taxpulse-stage-changed",
        TAXPULSE_ACTION_ITEM_CREATED_TOPIC_ARN:
          "arn:aws:sns:us-east-1:123456789012:taxpulse-action-item-created.fifo",
      },
      stageChangedSnsClient: {
        send: stageChangedSend,
      },
      actionItemCreatedSnsClient: {
        send: actionItemSend,
      },
    });

    const response = await runtime.handler({
      body: JSON.stringify({
        action_item: {
          description: "Send the client presentation packet",
          deadline: "2026-08-14",
        },
      }),
      pathParameters: {
        caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
      },
      requestContext: {
        authorizer: {
          tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e92",
          userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e93",
          role: "Firm Admin",
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(stageChangedSend).toHaveBeenCalledTimes(1);
    expect(actionItemSend).toHaveBeenCalledTimes(1);

    const stageChangedCommand = stageChangedCommands[0];
    expect(stageChangedCommand).toBeInstanceOf(PublishCommand);
    const stageChangedMessage = JSON.parse(
      String(stageChangedCommand?.input.Message),
    ) as unknown;

    expect(stageChangedCloudEventSchemaV1.parse(stageChangedMessage)).toMatchObject({
      data: {
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
        tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e92",
        from_stage: "Review",
        to_stage: "Client Approval",
        actor: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e93",
      },
    });
    expect(stageChangedCommand?.input.TopicArn).toBe(
      "arn:aws:sns:us-east-1:123456789012:taxpulse-stage-changed",
    );

    const actionItemCommand = actionItemCommands[0];
    expect(actionItemCommand).toBeInstanceOf(PublishCommand);
    expect(actionItemCommand?.input.TopicArn).toBe(
      "arn:aws:sns:us-east-1:123456789012:taxpulse-action-item-created.fifo",
    );
    const actionItemMessage = JSON.parse(
      String(actionItemCommand?.input.Message),
    ) as unknown;

    expect(actionItemCommand?.input.MessageGroupId).toBe(
      "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
    );
    expect(actionItemCommand?.input.MessageDeduplicationId).toBe(
      actionItemCreatedCloudEventSchemaV1.parse(actionItemMessage).id,
    );
    expect(actionItemCreatedCloudEventSchemaV1.parse(actionItemMessage)).toMatchObject({
      data: {
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
        tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e92",
        description: "Send the client presentation packet",
        deadline: "2026-08-14",
        completed: false,
        actor: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e93",
      },
    });
  });
});
