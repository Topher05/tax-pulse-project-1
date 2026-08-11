import { asc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import { outboxDeadLetter, outboxEvent } from "../../../shared/database/schema.js";
import { PublishCommand, type SnsClient } from "./cloudEvents/stageChanged/index.js";

export interface OutboxEventPublisher {
  publish(payload: string): Promise<void> | void;
}

export interface UnsentOutboxEvent {
  id: string;
  payload: string;
}

export interface DeadLetterOutboxEvent extends UnsentOutboxEvent {
  failureReason: string;
}

export interface OutboxRelayStore {
  listUnsent(): Promise<UnsentOutboxEvent[]>;
  markSent(id: string, sentAt: Date): Promise<void>;
  moveToDeadLetter(event: DeadLetterOutboxEvent, failedAt: Date): Promise<void>;
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

export function createPostgresOutboxRelayStore(client: Client): OutboxRelayStore {
  const db = drizzle(client);

  return {
    async listUnsent() {
      return await db
        .select({
          id: outboxEvent.id,
          payload: outboxEvent.payload,
        })
        .from(outboxEvent)
        .where(isNull(outboxEvent.sentAt))
        .orderBy(asc(outboxEvent.createdAt));
    },
    async markSent(id, sentAt) {
      await db
        .update(outboxEvent)
        .set({ sentAt })
        .where(eq(outboxEvent.id, id));
    },
    async moveToDeadLetter(event, failedAt) {
      await db.transaction(async (transaction) => {
        await transaction.insert(outboxDeadLetter).values({
          outboxEventId: event.id,
          payload: event.payload,
          failureReason: event.failureReason,
          failedAt,
        });
        await transaction.delete(outboxEvent).where(eq(outboxEvent.id, event.id));
      });
    },
  };
}

export function createOutboxRelay(
  store: OutboxRelayStore,
  publisher: OutboxEventPublisher,
  options: OutboxRelayOptions = {},
): OutboxRelay {
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
      const rows = await store.listUnsent();

      for (const row of rows) {
        await publishWithRetry(row.payload);

        await store.markSent(row.id, now());
      }

      return rows.length;
    },
  };
}
