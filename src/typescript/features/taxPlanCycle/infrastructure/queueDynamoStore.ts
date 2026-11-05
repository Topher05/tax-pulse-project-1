import {
  DynamoDBClient,
  type DynamoDBClientConfig,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";

import { taxPlanCyclePrioritySchema, taxPlanCycleStageSchema } from "../taxPlanCycle.js";
import {
  TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_CASE_KEY,
  TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
  TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY,
  taxPlanCycleQueueProjectionItemSchema,
  type TaxPlanCycleQueueProjectionItem,
} from "./queueProjection.js";
import type { TaxPlanCycleQueueInput } from "../repositories/repository.js";

export interface TaxPlanCycleQueueProjectionReader {
  listQueue(
    input: TaxPlanCycleQueueInput,
  ): Promise<TaxPlanCycleQueueProjectionItem[]>;
}

export interface TaxPlanCycleQueueProjectionDynamoClient {
  send(command: QueryCommand): Promise<{
    Items?: Record<string, unknown>[];
  }>;
}

const queueProjectionDocumentSchema = z.strictObject({
  [TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY]: z.uuid(),
  [TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_CASE_KEY]: z.uuid(),
  client: z.uuid(),
  stage: taxPlanCycleStageSchema,
  owner: z.string().min(1),
  priority: taxPlanCyclePrioritySchema,
  due_date: z.iso.date(),
  is_overdue: z.boolean(),
});

function toTaxPlanCycleQueueProjectionItem(
  row: z.infer<typeof queueProjectionDocumentSchema>,
  asOfDate: string,
): TaxPlanCycleQueueProjectionItem {
  return taxPlanCycleQueueProjectionItemSchema.parse({
    tenant_id: row[TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY],
    case_id: row[TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_CASE_KEY],
    client: row.client,
    stage: row.stage,
    owner: row.owner,
    priority: row.priority,
    due_date: row.due_date,
    is_overdue: row.due_date < asOfDate,
  });
}

function sortQueueProjectionItems(
  left: TaxPlanCycleQueueProjectionItem,
  right: TaxPlanCycleQueueProjectionItem,
): number {
  const dueDateComparison = left.due_date.localeCompare(right.due_date);

  if (dueDateComparison !== 0) {
    return dueDateComparison;
  }

  return left.case_id.localeCompare(right.case_id);
}

export function createTaxPlanCycleQueueDynamoDocumentClient(
  env: NodeJS.ProcessEnv = process.env,
): DynamoDBDocumentClient {
  const regionName = env.AWS_REGION?.trim() || "us-east-1";
  const endpointUrl = env.TAXPULSE_DYNAMODB_ENDPOINT_URL?.trim();
  const clientConfig: DynamoDBClientConfig = {
    region: regionName,
  };

  if (endpointUrl) {
    clientConfig.endpoint = endpointUrl;
    clientConfig.credentials = {
      accessKeyId: env.AWS_ACCESS_KEY_ID?.trim() || "test",
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY?.trim() || "test",
    };
  }

  return DynamoDBDocumentClient.from(new DynamoDBClient(clientConfig));
}

export function createTaxPlanCycleQueueProjectionStore(
  dynamoDbClient: TaxPlanCycleQueueProjectionDynamoClient,
  tableName: string = TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
): TaxPlanCycleQueueProjectionReader {
  return {
    async listQueue({ tenantId, asOfDate = new Date().toISOString().slice(0, 10) }) {
      const response = await dynamoDbClient.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "#tenant_id = :tenant_id",
          ExpressionAttributeNames: {
            "#tenant_id": TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY,
          },
          ExpressionAttributeValues: {
            ":tenant_id": tenantId,
          },
        }),
      );
      const items = (response.Items ?? [])
        .map((item) => queueProjectionDocumentSchema.parse(item))
        .map((item) => toTaxPlanCycleQueueProjectionItem(item, asOfDate))
        .sort(sortQueueProjectionItems);

      return items;
    },
  };
}
