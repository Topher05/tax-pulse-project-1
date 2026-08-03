import {
  stageChangedCloudEventSchemaV1,
  type StageChangedCloudEventV1,
} from "../../stageChangedEvent.js";
import type { TaxPlanCycleRepository } from "../../repositories/repository.js";
import type { TaxPlanCycle } from "../../taxPlanCycle.js";
import {
  type ConsumerHandleResult,
  type ConsumerOptions,
  type IdempotencyGuard,
  type Writer,
} from "./model.js";
import {
  buildIdempotencyKey,
  createRedisIdempotencyStore,
  IdempotencyInProgressError,
  IdempotencyUnavailableError,
} from "./EventDeduplicator.js";
import {
  taxPlanCycleQueueProjectionItemSchema as queueProjectionItemSchema,
  type TaxPlanCycleQueueProjectionItem as QueueProjectionItem,
} from "../queueProjection.js";

export const STAGE_CHANGED_CONSUMER_NAME = "tax-plan-cycle-stage-changed";

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
  event: StageChangedCloudEventV1,
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
  const consumerName = options.consumerName ?? STAGE_CHANGED_CONSUMER_NAME;

  return {
    async handleStageChangedEvent(
      event: unknown,
    ): Promise<ConsumerHandleResult> {
      const parsedEvent = stageChangedCloudEventSchemaV1.parse(event);
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
  client: IdempotencyGuard,
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
    idempotencyStore: createRedisIdempotencyStore(client, {
      ttlSeconds: options.ttlSeconds,
    }),
  });
}

export {
  buildIdempotencyKey,
  IdempotencyInProgressError,
  IdempotencyUnavailableError,
};
