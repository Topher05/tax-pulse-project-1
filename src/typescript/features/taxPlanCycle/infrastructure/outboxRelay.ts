import { asc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import { outboxEvent } from "../../../shared/database/schema.js";
import { PublishCommand, type SnsClient } from "./cloudEvents/stageChanged/index.js";

export interface OutboxEventPublisher {
  publish(payload: string): Promise<void> | void;
}

export interface OutboxRelay {
  relayUnsentEvents(): Promise<number>;
}

export interface OutboxRelayOptions {
  now?: () => Date;
  maxPublishAttempts?: number;
  retryDelayMs?: (failedAttempt: number) => number;
  wait?: (milliseconds: number) => Promise<void>;
}

const defaultMaxPublishAttempts = 3;

function waitFor(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createSnsOutboxEventPublisher(
  snsClient: SnsClient,
  topicArn: string,
): OutboxEventPublisher {
  return {
    async publish(payload) {
      await snsClient.send(
        new PublishCommand({
          TopicArn: topicArn,
          Message: payload,
        }),
      );
    },
  };
}

export function createOutboxRelay(
  client: Client,
  publisher: OutboxEventPublisher,
  options: OutboxRelayOptions = {},
): OutboxRelay {
  const db = drizzle(client);
  const now = options.now ?? (() => new Date());
  const maxPublishAttempts = options.maxPublishAttempts ?? defaultMaxPublishAttempts;
  const retryDelayMs =
    options.retryDelayMs ?? ((failedAttempt) => 100 * 2 ** (failedAttempt - 1));
  const wait = options.wait ?? waitFor;

  if (!Number.isInteger(maxPublishAttempts) || maxPublishAttempts < 1) {
    throw new Error("maxPublishAttempts must be a positive integer.");
  }

  async function publishWithRetry(payload: string): Promise<void> {
    for (let attempt = 1; attempt <= maxPublishAttempts; attempt += 1) {
      try {
        await publisher.publish(payload);
        return;
      } catch (error) {
        if (attempt === maxPublishAttempts) {
          throw error;
        }

        await wait(retryDelayMs(attempt));
      }
    }
  }

  return {
    async relayUnsentEvents() {
      const rows = await db
        .select({
          id: outboxEvent.id,
          payload: outboxEvent.payload,
        })
        .from(outboxEvent)
        .where(isNull(outboxEvent.sentAt))
        .orderBy(asc(outboxEvent.createdAt));

      for (const row of rows) {
        await publishWithRetry(row.payload);

        await db
          .update(outboxEvent)
          .set({ sentAt: now() })
          .where(eq(outboxEvent.id, row.id));
      }

      return rows.length;
    },
  };
}
