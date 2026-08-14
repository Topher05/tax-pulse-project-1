import { createRedisIdempotencyStore } from "../stageChanged/index.js";
import type { IdempotencyGuard, IdempotencyInput } from "../model.js";
import type { ActionItem } from "../../../actionItem.js";
import type { ActionItemRepository } from "../../../repositories/actionItems.js";
import type { ActionItemCompletedCloudEventV1 } from "./model.js";

export const ACTION_ITEM_COMPLETED_CONSUMER_NAME = "tax-plan-cycle-action-item-completed";
export const ACTION_ITEM_COMPLETED_IDEMPOTENCY_NAMESPACE = "tax-plan-cycle-action-item-completed";

export interface ActionItemCompletedConsumerOptions {
  repository: Pick<ActionItemRepository, "markCompleted">;
  idempotency: IdempotencyGuard;
  ttlSeconds?: number;
}

export function createActionItemCompletedConsumer(options: ActionItemCompletedConsumerOptions): {
  handleActionItemCompletedEvent(
    event: ActionItemCompletedCloudEventV1,
  ): Promise<{ status: "processed" | "duplicate"; item?: ActionItem }>;
} {
  const ttlSeconds = options.ttlSeconds ?? 86_400;
  return {
    async handleActionItemCompletedEvent(event) {
      const idempotencyInput: IdempotencyInput = {
        tenantId: event.data.tenant_id,
        consumerName: ACTION_ITEM_COMPLETED_CONSUMER_NAME,
        eventId: event.id,
        namespace: ACTION_ITEM_COMPLETED_IDEMPOTENCY_NAMESPACE,
      };
      const store = createRedisIdempotencyStore(options.idempotency, { ttlSeconds });
      if (!(await store.claim(idempotencyInput))) {
        return { status: "duplicate" };
      }
      try {
        const item = await options.repository.markCompleted({
          caseId: event.data.case_id,
          actionItemId: event.data.action_item_id,
        });
        await store.complete(idempotencyInput);
        return { status: "processed", item: item ?? undefined };
      } catch (error) {
        await store.release(idempotencyInput);
        throw error;
      }
    },
  };
}

export function createRedisActionItemCompletedConsumer(
  redisClient: Pick<IdempotencyGuard, "get" | "set" | "del">,
  repository: Pick<ActionItemRepository, "markCompleted">,
  ttlSeconds = 86_400,
): ReturnType<typeof createActionItemCompletedConsumer> {
  return createActionItemCompletedConsumer({
    repository,
    idempotency: redisClient,
    ttlSeconds,
  });
}
