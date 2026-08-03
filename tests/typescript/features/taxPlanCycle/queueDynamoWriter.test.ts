import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { describe, expect, test, vi } from "vitest";

import {
  createWriter,
  type TaxPlanCycleQueueProjectionItem,
} from "../../../../src/typescript/index.js";

describe("tax plan cycle queue DynamoDB writer", () => {
  test("writes the projected item with a PutCommand", async () => {
    const item: TaxPlanCycleQueueProjectionItem = {
      tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e61",
      case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e62",
      client: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e63",
      stage: "Review",
      owner: "Advisor One",
      priority: "high",
      due_date: "2026-07-21",
      is_overdue: true,
    };
    const send = vi.fn(async (command: PutCommand) => {
      expect(command.input.TableName).toBe("taxpulse_plan_cycle_queue_projection");
      expect(command.input.Item).toEqual(item);
      return {};
    });
    const writer = createWriter({
      send,
    });

    await writer.upsert(item);

    expect(send).toHaveBeenCalledTimes(1);
  });
});
