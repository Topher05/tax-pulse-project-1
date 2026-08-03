import { PutCommand } from "@aws-sdk/lib-dynamodb";

import {
  TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
  type TaxPlanCycleQueueProjectionItem as QueueProjectionItem,
} from "../queueProjection.js";
import type { Writer, WriterClient } from "./model.js";

export function createWriter(
  client: WriterClient,
  tableName: string = TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
): Writer {
  return {
    async upsert(item: QueueProjectionItem): Promise<void> {
      await client.send(
        new PutCommand({
          TableName: tableName,
          Item: item,
        }),
      );
    },
  };
}
