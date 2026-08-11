import { describe, expect, test, vi } from "vitest";

import {
  createOutboxRelay,
  type OutboxRelayStore,
} from "../../../../src/typescript/index.js";

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
});
