import { describe, expect, test } from "vitest";
import { ZodError } from "zod";

import {
  actionItemCreatedCloudEventSchemaV1,
  actionItemCreatedEventDataSchema,
  actionItemCreatedEventSource,
  actionItemCreatedEventType,
  createActionItemCreatedCloudEvent,
  type ActionItemCreatedCloudEventV1,
} from "../../../../src/typescript/index.js";

const wellFormedActionItemEvent = {
  specversion: "1.0",
  id: "action-item-018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f10",
  source: actionItemCreatedEventSource,
  type: actionItemCreatedEventType,
  time: "2026-08-04T15:00:00.000Z",
  datacontenttype: "application/json",
  dataschema: actionItemCreatedEventDataSchema,
  data: {
    case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f11",
    tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f12",
    description: "Send the client checklist",
    deadline: "2026-08-21",
    completed: false,
    actor: "advisor-001",
  },
} as const;

describe("actionItemCreatedCloudEventSchemaV1", () => {
  test("parses a well-formed action-item CloudEvent", () => {
    const parsedEvent: ActionItemCreatedCloudEventV1 =
      actionItemCreatedCloudEventSchemaV1.parse(wellFormedActionItemEvent);

    expect(parsedEvent).toEqual(wellFormedActionItemEvent);
  });

  test("rejects missing required data fields", () => {
    const { deadline: _deadline, ...dataWithoutDeadline } =
      wellFormedActionItemEvent.data;

    const result = actionItemCreatedCloudEventSchemaV1.safeParse({
      ...wellFormedActionItemEvent,
      data: dataWithoutDeadline,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
      expect(result.error.issues[0]?.path).toEqual(["data", "deadline"]);
    }
  });

  test("builds a valid CloudEvent from publish input", () => {
    const event = createActionItemCreatedCloudEvent(
      {
        tenantId: wellFormedActionItemEvent.data.tenant_id,
        caseId: wellFormedActionItemEvent.data.case_id,
        description: wellFormedActionItemEvent.data.description,
        deadline: wellFormedActionItemEvent.data.deadline,
        actor: wellFormedActionItemEvent.data.actor,
      },
      {
        idFactory: () => wellFormedActionItemEvent.id,
        now: () => new Date(wellFormedActionItemEvent.time),
      },
    );

    expect(event).toEqual(wellFormedActionItemEvent);
  });
});
