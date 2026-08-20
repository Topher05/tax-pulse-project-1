import { describe, expect, test, vi } from "vitest";
import { Client } from "pg";

import {
  createOutboxRelay,
  createPostgresOutboxRelayStore,
  type OutboxRelayStore,
} from "../../../../src/typescript/index.js";
import { migrateDatabase } from "../../../../src/typescript/shared/database/migrate.js";
import { startDockerPostgresContainer } from "../../bootstrap/dockerPostgres.js";

async function withOutboxRelayDatabase<T>(callback: (client: Client) => Promise<T>): Promise<T> {
  const container = await startDockerPostgresContainer();
  const client = new Client({ connectionString: container.connectionUri });

  await client.connect();

  try {
    await migrateDatabase(client);
    return await callback(client);
  } finally {
    await client.end().catch(() => undefined);
    await container.stop();
  }
}

describe("outbox relay", () => {
  test("retries a transient publish failure and marks the row sent only after success", async () => {
    const row = {
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f01",
      payload: '{"id":"event-134"}',
      sentAt: null as Date | null,
    };
    const markSent = vi.fn(async (_id: string, sentAt: Date) => {
      row.sentAt = sentAt;
    });
    const store: OutboxRelayStore = {
      listUnsent: async () => (row.sentAt === null ? [row] : []),
      markSent,
      moveToDeadLetter: async () => undefined,
    };
    let publishAttempts = 0;
    const publish = vi.fn(async () => {
      expect(row.sentAt).toBeNull();
      publishAttempts += 1;

      if (publishAttempts === 1) {
        throw new Error("temporary SNS outage");
      }
    });
    const wait = vi.fn(async (_milliseconds: number) => undefined);
    const sentAt = new Date("2026-08-10T16:00:00.000Z");
    const relay = createOutboxRelay(store, { publish }, { now: () => sentAt, wait });

    await expect(relay.relayUnsentEvents()).resolves.toBe(1);

    expect(publish).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(100);
    expect(markSent).toHaveBeenCalledOnce();
    expect(markSent).toHaveBeenCalledWith(row.id, sentAt);
    expect(row.sentAt).toEqual(sentAt);
  });

  test("moves a persistently failing event to the DLQ and continues the queue", async () => {
    const poisonEvent = {
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f02",
      payload: '{"id":"poison-event"}',
    };
    const succeedingEvent = {
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f03",
      payload: '{"id":"succeeding-event"}',
    };
    const unsentEvents = new Map([
      [poisonEvent.id, poisonEvent],
      [succeedingEvent.id, succeedingEvent],
    ]);
    const markSent = vi.fn(async (id: string, _sentAt: Date) => {
      unsentEvents.delete(id);
    });
    const moveToDeadLetter = vi.fn(async (event: typeof poisonEvent, _failedAt: Date) => {
      unsentEvents.delete(event.id);
    });
    const store: OutboxRelayStore = {
      listUnsent: async () => Array.from(unsentEvents.values()),
      markSent,
      moveToDeadLetter,
    };
    const publish = vi.fn(async (payload: string) => {
      if (payload === poisonEvent.payload) {
        throw new Error("SNS unavailable");
      }
    });
    const wait = vi.fn(async (_milliseconds: number) => undefined);
    const failedAt = new Date("2026-08-10T16:05:00.000Z");
    const relay = createOutboxRelay(store, { publish }, {
      maxPublishAttempts: 2,
      now: () => failedAt,
      wait,
    });

    await expect(relay.relayUnsentEvents()).resolves.toBe(2);

    expect(publish).toHaveBeenCalledTimes(3);
    expect(publish).toHaveBeenNthCalledWith(1, poisonEvent.payload);
    expect(publish).toHaveBeenNthCalledWith(2, poisonEvent.payload);
    expect(publish).toHaveBeenNthCalledWith(3, succeedingEvent.payload);
    expect(wait).toHaveBeenCalledWith(100);
    expect(moveToDeadLetter).toHaveBeenCalledWith(
      {
        ...poisonEvent,
        failureReason: "SNS unavailable",
      },
      failedAt,
    );
    expect(markSent).toHaveBeenCalledWith(succeedingEvent.id, failedAt);
    expect(unsentEvents).toEqual(new Map());
  });

  test("persists the poison event payload and failure reason in the DLQ", async () => {
    await withOutboxRelayDatabase(async (client) => {
      const poisonEvent = {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f04",
        payload: '{"id":"poison-event"}',
      };
      const succeedingEvent = {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f05",
        payload: '{"id":"succeeding-event"}',
      };
      const occurredAt = new Date("2026-08-10T16:10:00.000Z");

      await client.query(
        `
          INSERT INTO outbox_event (id, payload, created_at)
          VALUES ($1, $2, $3), ($4, $5, $3)
        `,
        [
          poisonEvent.id,
          poisonEvent.payload,
          occurredAt,
          succeedingEvent.id,
          succeedingEvent.payload,
        ],
      );

      const publish = vi.fn(async (payload: string) => {
        if (payload === poisonEvent.payload) {
          throw new Error("SNS unavailable");
        }
      });
      const relay = createOutboxRelay(
        createPostgresOutboxRelayStore(client),
        { publish },
        {
          maxPublishAttempts: 2,
          now: () => occurredAt,
          wait: async () => undefined,
        },
      );

      await expect(relay.relayUnsentEvents()).resolves.toBe(2);

      expect(publish).toHaveBeenCalledTimes(3);
      const deadLetterRows = await client.query<{
        outbox_event_id: string;
        payload: string;
        failure_reason: string;
        failed_at: Date;
      }>(
        `
          SELECT outbox_event_id, payload, failure_reason, failed_at
          FROM outbox_dead_letter
        `,
      );
      expect(deadLetterRows.rows).toEqual([
        {
          outbox_event_id: poisonEvent.id,
          payload: poisonEvent.payload,
          failure_reason: "SNS unavailable",
          failed_at: occurredAt,
        },
      ]);

      const activeRows = await client.query<{
        id: string;
        sent_at: Date | null;
      }>("SELECT id, sent_at FROM outbox_event ORDER BY created_at");
      expect(activeRows.rows).toEqual([
        {
          id: succeedingEvent.id,
          sent_at: occurredAt,
        },
      ]);
    });
  });
});
