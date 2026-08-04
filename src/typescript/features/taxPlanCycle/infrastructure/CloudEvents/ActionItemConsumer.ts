import {
  actionItemCreatedCloudEventSchemaV1,
  type ActionItemCreatedCloudEventV1,
} from "../../actionItemCreatedEvent.js";
import type { ActionItemRepository } from "../../repositories/actionItems.js";
import {
  buildIdempotencyKey,
  createRedisIdempotencyStore,
  IdempotencyInProgressError,
  IdempotencyUnavailableError,
} from "./EventDeduplicator.js";
import type {
  IdempotencyGuard,
  IdempotencyStore,
} from "./model.js";
import type { ActionItem } from "../../actionItem.js";

export const ACTION_ITEM_CREATED_CONSUMER_NAME =
  "tax-plan-cycle-action-item-created";
export const ACTION_ITEM_CREATED_IDEMPOTENCY_NAMESPACE = "action-items";

export interface ActionItemCreatedConsumerOptions {
  repository: Pick<ActionItemRepository, "insert">;
  idempotencyStore: IdempotencyStore;
  consumerName?: string;
}

export interface ActionItemCreatedConsumerHandleResult {
  status: "processed" | "duplicate";
  item?: ActionItem;
}

function buildDeduplicationInput(
  event: ActionItemCreatedCloudEventV1,
  consumerName: string,
): {
  tenantId: string;
  consumerName: string;
  eventId: string;
  namespace: string;
} {
  return {
    tenantId: event.data.tenant_id,
    consumerName,
    eventId: event.id,
    namespace: ACTION_ITEM_CREATED_IDEMPOTENCY_NAMESPACE,
  };
}

export function createActionItemConsumer(
  options: ActionItemCreatedConsumerOptions,
): {
  handleActionItemCreatedEvent(
    event: unknown,
  ): Promise<ActionItemCreatedConsumerHandleResult>;
} {
  const consumerName = options.consumerName ?? ACTION_ITEM_CREATED_CONSUMER_NAME;

  return {
    async handleActionItemCreatedEvent(
      event: unknown,
    ): Promise<ActionItemCreatedConsumerHandleResult> {
      const parsedEvent = actionItemCreatedCloudEventSchemaV1.parse(event);
      const idempotencyInput = buildDeduplicationInput(parsedEvent, consumerName);
      const claimed = await options.idempotencyStore.claim(idempotencyInput);

      if (!claimed) {
        return {
          status: "duplicate",
        };
      }

      try {
        const item = await options.repository.insert({
          caseId: parsedEvent.data.case_id,
          description: parsedEvent.data.description,
          deadline: parsedEvent.data.deadline,
          completed: parsedEvent.data.completed,
        });

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

export function createRedisActionItemConsumer(
  client: IdempotencyGuard,
  repository: Pick<ActionItemRepository, "insert">,
  options: {
    consumerName?: string;
    ttlSeconds?: number;
  } = {},
): {
  handleActionItemCreatedEvent(
    event: unknown,
  ): Promise<ActionItemCreatedConsumerHandleResult>;
} {
  return createActionItemConsumer({
    repository,
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
