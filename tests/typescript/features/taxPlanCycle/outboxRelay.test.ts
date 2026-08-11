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
});
