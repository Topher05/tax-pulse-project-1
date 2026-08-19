import { randomUUID } from "node:crypto";

import { z } from "zod";

export const actionItemCompletedEventType =
  "com.taxpulse.tax_plan_cycle.action_item_completed.v1";
export const actionItemCompletedEventSource = "taxpulse.platform.tax-plan-cycle";
export const actionItemCompletedEventDataSchema =
  "taxpulse://schemas/platform/action-item-completed/v1";
export const actionItemCompletedEventSchemaVersion = "1";

export interface ActionItemCompletedEventPublishInput {
  tenantId: string;
  caseId: string;
  actionItemId: number;
  actor: string;
}

export const actionItemCompletedEventDataSchemaV1 = z.strictObject({
  tenant_id: z.uuid(),
  case_id: z.uuid(),
  action_item_id: z.number().int().positive(),
  actor: z.string().min(1),
});

export const actionItemCompletedCloudEventSchemaV1 = z.strictObject({
  specversion: z.literal("1.0"),
  id: z.string().min(1),
  source: z.literal(actionItemCompletedEventSource),
  type: z.literal(actionItemCompletedEventType),
  time: z.iso.datetime(),
  datacontenttype: z.literal("application/json"),
  dataschema: z.literal(actionItemCompletedEventDataSchema),
  data: actionItemCompletedEventDataSchemaV1,
});

export type ActionItemCompletedCloudEventV1 = z.infer<
  typeof actionItemCompletedCloudEventSchemaV1
>;

export function createActionItemCompletedCloudEvent(
  input: ActionItemCompletedEventPublishInput,
  options: { idFactory?: () => string; now?: () => Date } = {},
): ActionItemCompletedCloudEventV1 {
  return actionItemCompletedCloudEventSchemaV1.parse({
    specversion: "1.0",
    id: options.idFactory?.() ?? randomUUID(),
    source: actionItemCompletedEventSource,
    type: actionItemCompletedEventType,
    time: (options.now ?? (() => new Date()))().toISOString(),
    datacontenttype: "application/json",
    dataschema: actionItemCompletedEventDataSchema,
    data: {
      tenant_id: input.tenantId,
      case_id: input.caseId,
      action_item_id: input.actionItemId,
      actor: input.actor,
    },
  });
}
