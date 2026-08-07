import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { createClient } from "redis";

import { createRedisIdempotencyStore } from "../stageChanged/index.js";
import type {
  ActionItemCreatedCloudEventV1,
} from "./model.js";
import type {
  IdempotencyGuard,
  IdempotencyInput,
} from "../model.js";
import type { ActionItemRepository } from "../../../repositories/actionItems.js";
import type { ActionItem } from "../../../actionItem.js";

loadEnv();

export const ACTION_ITEM_CREATED_CONSUMER_NAME = "tax-plan-cycle-action-item-created";
export const ACTION_ITEM_CREATED_IDEMPOTENCY_NAMESPACE = "tax-plan-cycle-action-item-created";

export interface ActionItemCreatedConsumerOptions {
  repository: Pick<ActionItemRepository, "insert">;
  idempotency: IdempotencyGuard;
  ttlSeconds?: number;
}

export interface ActionItemCreatedConsumerHandleResult {
  status: "processed" | "duplicate";
  item?: ActionItem;
}

export function createActionItemConsumer(
  options: ActionItemCreatedConsumerOptions,
): {
  handleActionItemCreatedEvent(
    event: ActionItemCreatedCloudEventV1,
  ): Promise<ActionItemCreatedConsumerHandleResult>;
} {
  const ttlSeconds = options.ttlSeconds ?? 86_400;

  return {
    async handleActionItemCreatedEvent(
      event: ActionItemCreatedCloudEventV1,
    ): Promise<ActionItemCreatedConsumerHandleResult> {
      const idempotencyInput: IdempotencyInput = {
        tenantId: event.data.tenant_id,
        consumerName: ACTION_ITEM_CREATED_CONSUMER_NAME,
        eventId: event.id,
        namespace: ACTION_ITEM_CREATED_IDEMPOTENCY_NAMESPACE,
      };

      const store = createRedisIdempotencyStore(options.idempotency, {
        ttlSeconds,
      });
      const claim = await store.claim(idempotencyInput);
      if (!claim) {
        return { status: "duplicate" };
      }

      try {
        const item = await options.repository.insert({
          caseId: event.data.case_id,
          description: event.data.description,
          deadline: event.data.deadline,
          completed: event.data.completed,
        });

        await store.complete(idempotencyInput);
        return { status: "processed", item };
      } catch (error) {
        await store.release(idempotencyInput);
        throw error;
      }
    },
  };
}

export function createRedisActionItemConsumer(
  redisClient: Pick<IdempotencyGuard, "get" | "set" | "del">,
  repository: Pick<ActionItemRepository, "insert">,
  ttlSeconds = 86_400,
): {
  handleActionItemCreatedEvent(
    event: ActionItemCreatedCloudEventV1,
  ): Promise<ActionItemCreatedConsumerHandleResult>;
} {
  return createActionItemConsumer({
    repository,
    idempotency: redisClient,
    ttlSeconds,
  });
}
