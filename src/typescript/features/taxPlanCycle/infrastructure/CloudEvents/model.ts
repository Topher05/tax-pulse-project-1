import type { PutCommand } from "@aws-sdk/lib-dynamodb";

import type { TaxPlanCycleRepository } from "../../repositories/repository.js";
import type { TaxPlanCycle } from "../../taxPlanCycle.js";
import type { TaxPlanCycleQueueProjectionItem } from "../queueProjection.js";

export interface TaxPlanCycleQueueProjectionWriterClient {
  send(command: PutCommand): Promise<unknown>;
}

export interface TaxPlanCycleQueueProjectionWriter {
  upsert(item: TaxPlanCycleQueueProjectionItem): Promise<void>;
}

export interface TaxPlanCycleQueueProjectionIdempotencyClient {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { EX?: number; NX?: boolean },
  ): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export interface TaxPlanCycleQueueProjectionIdempotencyInput {
  tenantId: string;
  consumerName: string;
  eventId: string;
}

export interface TaxPlanCycleQueueProjectionIdempotencyStore {
  claim(input: TaxPlanCycleQueueProjectionIdempotencyInput): Promise<boolean>;
  complete(input: TaxPlanCycleQueueProjectionIdempotencyInput): Promise<void>;
  release(input: TaxPlanCycleQueueProjectionIdempotencyInput): Promise<void>;
}

export interface TaxPlanCycleQueueProjectionStageChangedEventData {
  tenant_id: string;
  case_id: string;
  from_stage: TaxPlanCycle["stage"];
  to_stage: TaxPlanCycle["stage"];
  actor: string;
}

export interface TaxPlanCycleQueueProjectionStageChangedCloudEvent {
  specversion: "1.0";
  id: string;
  source: string;
  type: "com.taxpulse.tax-plan-cycle.stage-changed";
  time: string;
  datacontenttype?: "application/json";
  data: TaxPlanCycleQueueProjectionStageChangedEventData;
}

export interface TaxPlanCycleQueueProjectionConsumerHandleResult {
  status: "processed" | "duplicate";
  item?: TaxPlanCycleQueueProjectionItem;
}

export interface TaxPlanCycleQueueProjectionConsumerOptions {
  repository: Pick<TaxPlanCycleRepository, "findByCaseId">;
  writer: TaxPlanCycleQueueProjectionWriter;
  idempotencyStore: TaxPlanCycleQueueProjectionIdempotencyStore;
  consumerName?: string;
}
