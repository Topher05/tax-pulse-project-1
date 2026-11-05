import { describe, expect, test, vi } from "vitest";

import {
  createExecuteLambdaRuntime,
} from "../../../../src/typescript/shared/scripts/execute-lambda/runtime.js";
import { PublishCommand, stageChangedCloudEventSchemaV1 } from "../../../../src/typescript/index.js";

describe("execute Lambda runtime", () => {
  test("publishes a stage-changed event through SNS when executed", async () => {
    const stageChangedCommands: PublishCommand[] = [];
    const stageChangedSend = vi.fn(async (command: PublishCommand) => {
      stageChangedCommands.push(command);
      return {};
    });
    const runtime = await createExecuteLambdaRuntime({
      env: {
        AWS_REGION: "us-east-1",
        TAXPULSE_STAGE_CHANGED_TOPIC_ARN:
          "arn:aws:sns:us-east-1:123456789012:taxpulse-stage-changed",
      },
      stageChangedSnsClient: {
        send: stageChangedSend,
      },
    });

    const response = await runtime.handler({
      pathParameters: {
        caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
      },
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e92",
              sub: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e93",
              role: "Firm Admin",
            },
          },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(stageChangedSend).toHaveBeenCalledTimes(1);

    const stageChangedCommand = stageChangedCommands[0];
    expect(stageChangedCommand).toBeInstanceOf(PublishCommand);
    const stageChangedMessage = JSON.parse(
      String(stageChangedCommand?.input.Message),
    ) as unknown;

    expect(stageChangedCloudEventSchemaV1.parse(stageChangedMessage)).toMatchObject({
      data: {
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
        tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e92",
        from_stage: "Client Approval",
        to_stage: "Executed",
        actor: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e93",
      },
    });
    expect(stageChangedCommand?.input.TopicArn).toBe(
      "arn:aws:sns:us-east-1:123456789012:taxpulse-stage-changed",
    );
  });
});
