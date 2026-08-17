import { describe, expect, test, vi } from "vitest";
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
} from "@aws-sdk/client-sqs";

import {
  createActionItemCompletedCloudEvent,
  createActionItemCompletedSqsConsumer,
  getActionItemCompletedQueueUrlFromEnv,
} from "../../../../src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/actionItemCompleted/index.js";
import type { IdempotencyGuard } from "../../../../src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/stageChanged/index.js";

const completionInput = {
  tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e81",
  caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e82",
  actionItemId: 42,
  actor: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e83",
};

function createInMemoryRedisClient(): IdempotencyGuard {
  const store = new Map<string, string>();

  return {
    async get(key) {
      return store.get(key) ?? null;
    },
    async set(key, value, options) {
      if (options?.NX && store.has(key)) {
        return null;
      }
      store.set(key, value);
      return "OK";
    },
    async del(key) {
      store.delete(key);
      return 1;
    },
  };
}

describe("action-item-completed SQS consumer", () => {
  test("projects a published completion event exactly once and deletes it after success", async () => {
    const event = createActionItemCompletedCloudEvent(completionInput, {
      idFactory: () => "action-item-completed-144",
      now: () => new Date("2026-08-12T20:00:00.000Z"),
    });
    const sqsSend = vi.fn(async (command: ReceiveMessageCommand | DeleteMessageCommand) => {
      if (command instanceof ReceiveMessageCommand) {
        return {
          Messages: [{
            MessageId: "sqs-message-144",
            ReceiptHandle: "receipt-handle-144",
            Body: JSON.stringify({ Type: "Notification", Message: JSON.stringify(event) }),
          }],
        };
      }
      return {};
    });
    const markCompleted = vi.fn(async () => ({
      id: completionInput.actionItemId,
      case_id: completionInput.caseId,
      description: "Submit the estimated tax payment",
      deadline: "2026-09-15",
      completed: true,
    }));
    const logger = { info: vi.fn(), warn: vi.fn() };
    const consumer = createActionItemCompletedSqsConsumer(
      { send: sqsSend },
      "https://sqs.us-east-1.amazonaws.com/123456789012/action-item-completed",
      logger,
      {
        repository: { markCompleted },
        idempotency: createInMemoryRedisClient(),
        waitTimeSeconds: 0,
      },
    );

    await expect(consumer.consumeActionItemCompletedEventsOnce()).resolves.toEqual({
      received: 1,
      processed: 1,
      duplicate: 0,
      failed: 0,
    });
    await expect(consumer.consumeActionItemCompletedEventsOnce()).resolves.toEqual({
      received: 1,
      processed: 0,
      duplicate: 1,
      failed: 0,
    });

    expect(markCompleted).toHaveBeenCalledTimes(1);
    expect(markCompleted).toHaveBeenCalledWith({
      caseId: completionInput.caseId,
      actionItemId: completionInput.actionItemId,
    });
    expect(logger.warn).not.toHaveBeenCalled();
    expect(sqsSend.mock.calls.filter(([command]) => command instanceof DeleteMessageCommand)).toHaveLength(2);
  });

  test("requires a dedicated completion subscription queue", () => {
    expect(() => getActionItemCompletedQueueUrlFromEnv({})).toThrow(
      "TAXPULSE_ACTION_ITEM_COMPLETED_QUEUE_URL is required",
    );
  });
});
