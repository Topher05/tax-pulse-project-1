import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { describe, expect, test, vi } from "vitest";

import {
  TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
  createTaxPlanCycleQueueProjectionStore,
} from "../../src/typescript/taxPlanCycleQueueDynamoStore.js";

const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e71";
const asOfDate = "2026-07-15";

describe("tax plan cycle queue DynamoDB store", () => {
  test("queries the tenant partition and recomputes overdue items in due-date order", async () => {
    const send = vi.fn(async (command: QueryCommand) => {
      expect(command.input.TableName).toBe(
        TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
      );
      expect(command.input.KeyConditionExpression).toBe(
        "#tenant_id = :tenant_id",
      );
      expect(command.input.ExpressionAttributeNames).toEqual({
        "#tenant_id": "tenant_id",
      });
      expect(command.input.ExpressionAttributeValues).toEqual({
        ":tenant_id": tenantId,
      });

      return {
        Items: [
          {
            tenant_id: tenantId,
            case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e73",
            client: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e74",
            stage: "Review",
            owner: "advisor-dynamo-002",
            priority: "high",
            due_date: "2026-08-10",
            is_overdue: false,
          },
          {
            tenant_id: tenantId,
            case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e72",
            client: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e75",
            stage: "Intake",
            owner: "advisor-dynamo-001",
            priority: "low",
            due_date: "2026-07-10",
            is_overdue: false,
          },
        ],
      };
    });
    const store = createTaxPlanCycleQueueProjectionStore({
      send,
    });

    await expect(
      store.listQueue({
        tenantId,
        asOfDate,
      }),
    ).resolves.toEqual([
      {
        tenant_id: tenantId,
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e72",
        client: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e75",
        stage: "Intake",
        owner: "advisor-dynamo-001",
        priority: "low",
        due_date: "2026-07-10",
        is_overdue: true,
      },
      {
        tenant_id: tenantId,
        case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e73",
        client: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e74",
        stage: "Review",
        owner: "advisor-dynamo-002",
        priority: "high",
        due_date: "2026-08-10",
        is_overdue: false,
      },
    ]);

    expect(send).toHaveBeenCalledTimes(1);
  });
});
