import { DeleteMessageCommand, ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import { PublishCommand } from "@aws-sdk/client-sns";
import { describe, expect, test, vi } from "vitest";

import {
  createSnsStageChangedEventPublisher,
  createSqsStageChangedEventConsumer,
  getStageChangedQueueUrlFromEnv,
  parseStageChangedSqsMessage,
  stageChangedCloudEventSchemaV1,
} from "../../../../src/typescript/index.js";

const transitionInput = {
  tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e81",
  caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e82",
  fromStage: "Intake" as const,
  toStage: "Data Aggregation" as const,
  actor: "advisor-132",
};

function createSnsNotificationEnvelope(message: string): string {
  return JSON.stringify({
    Type: "Notification",
    MessageId: "sns-message-132",
    TopicArn: "arn:aws:sns:us-east-1:123456789012:taxpulse-stage-changed",
    Message: message,
  });
}

describe("stage-changed SQS consumer", () => {
  test("receives and parses a published stage-changed event from an SNS envelope", async () => {
    const snsSend = vi.fn(async (_command: PublishCommand) => ({}));
    const publisher = createSnsStageChangedEventPublisher(
      { send: snsSend },
      "arn:aws:sns:us-east-1:123456789012:taxpulse-stage-changed",
      {
        idFactory: () => "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e83",
        now: () => new Date("2026-07-01T14:00:00.000Z"),
      },
    );

    await publisher.publishStageChanged(transitionInput);

    const publishedCommand = snsSend.mock.calls[0]?.[0];
    expect(publishedCommand).toBeInstanceOf(PublishCommand);
    const sqsMessageBody = createSnsNotificationEnvelope(
      String(publishedCommand?.input.Message),
    );
    const sqsSend = vi.fn(async (command: ReceiveMessageCommand | DeleteMessageCommand) => {
      if (command instanceof ReceiveMessageCommand) {
        return {
          Messages: [
            {
              MessageId: "sqs-message-132",
              ReceiptHandle: "receipt-handle-132",
              Body: sqsMessageBody,
            },
          ],
        };
      }

      return {};
    });
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
    };
    const consumer = createSqsStageChangedEventConsumer(
      { send: sqsSend },
      "https://sqs.us-east-1.amazonaws.com/123456789012/taxpulse-stage-changed",
      logger,
      { waitTimeSeconds: 0 },
    );

    const result = await consumer.consumeStageChangedEventsOnce();

    expect(result).toEqual({
      received: 1,
      processed: 1,
      failed: 0,
    });
    const parsedEvent = parseStageChangedSqsMessage({
      Body: sqsMessageBody,
    });
    expect(stageChangedCloudEventSchemaV1.parse(parsedEvent)).toMatchObject({
      id: "stage-transition-018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e83",
      data: {
        case_id: transitionInput.caseId,
        tenant_id: transitionInput.tenantId,
        from_stage: "Intake",
        to_stage: "Data Aggregation",
        actor: "advisor-132",
      },
    });
    expect(logger.info).toHaveBeenCalledWith(
      {
        event_id: "stage-transition-018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e83",
        tenant_id: transitionInput.tenantId,
        case_id: transitionInput.caseId,
        from_stage: "Intake",
        to_stage: "Data Aggregation",
        actor: "advisor-132",
      },
      "Received stage-changed event from SQS",
    );
    expect(logger.warn).not.toHaveBeenCalled();
    expect(sqsSend).toHaveBeenCalledTimes(2);
    const deleteCommand = sqsSend.mock.calls[1]?.[0];
    expect(deleteCommand).toBeInstanceOf(DeleteMessageCommand);
    expect(deleteCommand?.input).toMatchObject({
      QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/taxpulse-stage-changed",
      ReceiptHandle: "receipt-handle-132",
    });
  });

  test("rejects invalid CloudEvents without deleting the SQS message", async () => {
    const sqsSend = vi.fn(async (command: ReceiveMessageCommand | DeleteMessageCommand) => {
      if (command instanceof ReceiveMessageCommand) {
        return {
          Messages: [
            {
              MessageId: "sqs-message-invalid-132",
              ReceiptHandle: "receipt-handle-invalid-132",
              Body: createSnsNotificationEnvelope(
                JSON.stringify({
                  specversion: "1.0",
                  id: "stage-transition-invalid-132",
                }),
              ),
            },
          ],
        };
      }

      return {};
    });
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
    };
    const consumer = createSqsStageChangedEventConsumer(
      { send: sqsSend },
      "https://sqs.us-east-1.amazonaws.com/123456789012/taxpulse-stage-changed",
      logger,
      { waitTimeSeconds: 0 },
    );

    const result = await consumer.consumeStageChangedEventsOnce();

    expect(result).toEqual({
      received: 1,
      processed: 0,
      failed: 1,
    });
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        message_id: "sqs-message-invalid-132",
      }),
      "Rejected invalid stage-changed SQS message",
    );
    expect(sqsSend).toHaveBeenCalledTimes(1);
  });

  test("rejects missing queue configuration", () => {
    expect(() =>
      getStageChangedQueueUrlFromEnv({
        TAXPULSE_STAGE_CHANGED_QUEUE_URL: "   ",
      }),
    ).toThrow("TAXPULSE_STAGE_CHANGED_QUEUE_URL is required");
  });
});
