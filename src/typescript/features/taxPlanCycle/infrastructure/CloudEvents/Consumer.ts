import { z } from "zod";

import {
  taxPlanCycleStageSchema,
  type TaxPlanCycle,
} from "../../taxPlanCycle.js";
import type { TaxPlanCycleRepository } from "../../repositories/repository.js";
import {
  type ConsumerHandleResult,
  type ConsumerOptions,
  type IdempotencyClient,
  type StageChangedCloudEvent,
  type Writer,
} from "./model.js";
import {
  buildIdempotencyKey,
  createRedisEventDeduplicator,
  DeduplicatorInProgressError,
  DeduplicatorUnavailableError,
} from "./EventDeduplicator.js";
import {
  taxPlanCycleQueueProjectionItemSchema as queueProjectionItemSchema,
  type TaxPlanCycleQueueProjectionItem as QueueProjectionItem,
} from "../queueProjection.js";

export const TAX_PULSE_STAGE_CHANGED_CONSUMER_NAME =
  "tax-plan-cycle-stage-changed";

const stageChangedEventDataSchema = z.strictObject({
  tenant_id: z.uuid(),
  case_id: z.uuid(),
  from_stage: taxPlanCycleStageSchema,
  to_stage: taxPlanCycleStageSchema,
  actor: z.string().min(1),
});

export const stageChangedCloudEventSchema = z.strictObject({
  specversion: z.literal("1.0"),
  id: z.string().min(1),
  source: z.string().min(1),
  type: z.literal("com.taxpulse.tax-plan-cycle.stage-changed"),
  time: z.iso.datetime(),
  datacontenttype: z.literal("application/json").optional(),
  data: stageChangedEventDataSchema,
});

function todayIsoDateFromEventTime(eventTime: string): string {
  return eventTime.slice(0, 10);
}

function projectTaxPlanCycleToQueueItem(
  tenantId: string,
  cycle: TaxPlanCycle,
  asOfDate: string,
): QueueProjectionItem {
  return queueProjectionItemSchema.parse({
    tenant_id: tenantId,
    case_id: cycle.id,
    client: cycle.client_id,
    stage: cycle.stage,
    owner: cycle.owner,
    priority: cycle.priority,
    due_date: cycle.due_date,
    is_overdue: cycle.due_date < asOfDate,
  });
}

function buildDeduplicationInput(
  event: StageChangedCloudEvent,
  consumerName: string,
): {
  tenantId: string;
  consumerName: string;
  eventId: string;
} {
  return {
    tenantId: event.data.tenant_id,
    consumerName,
    eventId: event.id,
  };
}

export function createConsumer(
  options: ConsumerOptions,
): {
  handleStageChangedEvent(
    event: unknown,
  ): Promise<ConsumerHandleResult>;
} {
  const consumerName = options.consumerName ?? TAX_PULSE_STAGE_CHANGED_CONSUMER_NAME;

  return {
    async handleStageChangedEvent(
      event: unknown,
    ): Promise<ConsumerHandleResult> {
      const parsedEvent = stageChangedCloudEventSchema.parse(event);
      const idempotencyInput = buildDeduplicationInput(parsedEvent, consumerName);
      const claimed = await options.idempotencyStore.claim(idempotencyInput);

      if (!claimed) {
        return {
          status: "duplicate",
        };
      }

      try {
        const cycle = await options.repository.findByCaseId({
          tenantId: parsedEvent.data.tenant_id,
          caseId: parsedEvent.data.case_id,
        });

        if (!cycle) {
          throw new Error(
            `Tax Plan Cycle ${parsedEvent.data.case_id} was not found for tenant ${parsedEvent.data.tenant_id}.`,
          );
        }

        const item = projectTaxPlanCycleToQueueItem(
          parsedEvent.data.tenant_id,
          cycle,
          todayIsoDateFromEventTime(parsedEvent.time),
        );

        await options.writer.upsert(item);
        await options.idempotencyStore.complete(idempotencyInput);

        return {
          status: "processed",
          item,
        };
      } catch (error) {
        await options.idempotencyStore.release(idempotencyInput);
        throw error;
      }
    },
  };
}

export function createRedisConsumer(
  client: IdempotencyClient,
  repository: Pick<TaxPlanCycleRepository, "findByCaseId">,
  writer: Writer,
  options: {
    consumerName?: string;
    ttlSeconds?: number;
  } = {},
): {
  handleStageChangedEvent(
    event: unknown,
  ): Promise<ConsumerHandleResult>;
} {
  return createConsumer({
    repository,
    writer,
    consumerName: options.consumerName,
    idempotencyStore: createRedisEventDeduplicator(client, {
      ttlSeconds: options.ttlSeconds,
    }),
  });
}

export {
  buildIdempotencyKey,
  DeduplicatorInProgressError,
  DeduplicatorUnavailableError,
};
