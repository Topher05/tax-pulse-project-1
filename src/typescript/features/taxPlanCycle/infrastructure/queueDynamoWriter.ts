import { PutCommand } from "@aws-sdk/lib-dynamodb";

import {
  TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
  type TaxPlanCycleQueueProjectionItem,
} from "./queueProjection.js";

export interface TaxPlanCycleQueueProjectionWriterClient {
  send(command: PutCommand): Promise<unknown>;
}

export interface TaxPlanCycleQueueProjectionWriter {
  upsert(item: TaxPlanCycleQueueProjectionItem): Promise<void>;
}

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
