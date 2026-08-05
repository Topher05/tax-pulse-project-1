import { describe, expect, test } from "vitest";
import { ZodError } from "zod";

import {
  stageChangedCloudEventSchemaV1,
  stageChangedEventDataSchema,
  stageChangedEventSource,
  stageChangedEventType,
  type StageChangedCloudEventV1,
} from "../../../../src/typescript/index.js";

const wellFormedStageChangedEvent = {
  specversion: "1.0",
  id: "stage-transition-018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d34",
  source: stageChangedEventSource,
  type: stageChangedEventType,
  time: "2026-07-01T14:00:00.000Z",
  datacontenttype: "application/json",
  dataschema: stageChangedEventDataSchema,
  data: {
    case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d33",
    tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d11",
    from_stage: "Intake",
    to_stage: "Data Aggregation",
    actor: "advisor-001",
  },
} as const;

describe("stageChangedCloudEventSchemaV1", () => {
  test("parses a well-formed stage-changed CloudEvent", () => {
    const parsedEvent: StageChangedCloudEventV1 =
      stageChangedCloudEventSchemaV1.parse(wellFormedStageChangedEvent);

    expect(parsedEvent).toEqual(wellFormedStageChangedEvent);
  });

  test("rejects missing required data fields", () => {
    const { case_id: _caseId, ...dataWithoutCaseId } =
      wellFormedStageChangedEvent.data;

    const result = stageChangedCloudEventSchemaV1.safeParse({
      ...wellFormedStageChangedEvent,
      data: dataWithoutCaseId,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
      expect(result.error.issues[0]?.path).toEqual(["data", "case_id"]);
    }
  });

  test("rejects invalid tenant identifiers", () => {
    expect(
      stageChangedCloudEventSchemaV1.safeParse({
        ...wellFormedStageChangedEvent,
        data: {
          ...wellFormedStageChangedEvent.data,
          tenant_id: "tenant-001",
        },
      }).success,
    ).toBe(false);
  });

  test("rejects unknown workflow stages", () => {
    expect(
      stageChangedCloudEventSchemaV1.safeParse({
        ...wellFormedStageChangedEvent,
        data: {
          ...wellFormedStageChangedEvent.data,
          from_stage: "Unknown",
        },
      }).success,
    ).toBe(false);
  });

  test("rejects an empty actor", () => {
    expect(
      stageChangedCloudEventSchemaV1.safeParse({
        ...wellFormedStageChangedEvent,
        data: {
          ...wellFormedStageChangedEvent.data,
          actor: "",
        },
      }).success,
    ).toBe(false);
  });

  test.each([
    ["wrong specversion", { specversion: "0.3" }],
    ["wrong event type", { type: "com.taxpulse.tax_plan_cycle.stage_changed" }],
    [
      "wrong data schema",
      { dataschema: "taxpulse://schemas/platform/stage-changed/v2" },
    ],
  ])("rejects %s", (_name, override) => {
    expect(
      stageChangedCloudEventSchemaV1.safeParse({
        ...wellFormedStageChangedEvent,
        ...override,
      }).success,
    ).toBe(false);
  });
});
