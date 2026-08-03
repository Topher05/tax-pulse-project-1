import { PutCommand } from "@aws-sdk/lib-dynamodb";

import {
  TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
  type TaxPlanCycleQueueProjectionItem,
} from "../queueProjection.js";
import type {
  TaxPlanCycleQueueProjectionWriter,
  TaxPlanCycleQueueProjectionWriterClient,
} from "./model.js";

export function createTaxPlanCycleQueueProjectionWriter(
  client: TaxPlanCycleQueueProjectionWriterClient,
  tableName: string = TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
): TaxPlanCycleQueueProjectionWriter {
  return {
    async upsert(item: TaxPlanCycleQueueProjectionItem): Promise<void> {
      await client.send(
        new PutCommand({
          TableName: tableName,
          Item: item,
        }),
      );
    },
  };
}
