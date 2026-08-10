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
        await publisher.publish(row.payload);

        await db
          .update(outboxEvent)
          .set({ sentAt: now() })
          .where(eq(outboxEvent.id, row.id));
      }

      return rows.length;
    },
  };
}
