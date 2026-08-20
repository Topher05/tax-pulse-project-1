import { randomUUID } from "node:crypto";

import { z } from "zod";

export const actionItemCreatedEventType =
  "com.taxpulse.tax_plan_cycle.action_item_created.v1";
export const actionItemCreatedEventSource = "taxpulse.platform.tax-plan-cycle";
export const actionItemCreatedEventDataSchema =
  "taxpulse://schemas/platform/action-item-created/v1";
export const actionItemCreatedEventSchemaVersion = "1";

export interface ActionItemCreatedEventInput {
  description: string;
  deadline: string;
  completed?: boolean;
}

export const actionItemCreatedEventInputSchema = z.strictObject({
  description: z.string().min(1),
  deadline: z.iso.date(),
  completed: z.boolean().optional(),
});

export interface ActionItemCreatedEventPublishInput
  extends ActionItemCreatedEventInput {
  tenantId: string;
  caseId: string;
  actor: string;
}

export interface CreateActionItemCreatedCloudEventOptions {
  idFactory?: () => string;
  now?: () => Date;
}

export const actionItemCreatedEventDataSchemaV1 = z.strictObject({
  case_id: z.uuid(),
  tenant_id: z.uuid(),
  description: z.string().min(1),
  deadline: z.iso.date(),
  completed: z.boolean(),
  actor: z.string().min(1),
});

export const actionItemCreatedCloudEventSchemaV1 = z.strictObject({
  specversion: z.literal("1.0"),
  id: z.string().min(1),
  source: z.literal(actionItemCreatedEventSource),
  type: z.literal(actionItemCreatedEventType),
  time: z.iso.datetime(),
  datacontenttype: z.literal("application/json"),
  dataschema: z.literal(actionItemCreatedEventDataSchema),
  data: actionItemCreatedEventDataSchemaV1,
});

export type ActionItemCreatedEventDataV1 = z.infer<
  typeof actionItemCreatedEventDataSchemaV1
>;
export type ActionItemCreatedCloudEventV1 = z.infer<
  typeof actionItemCreatedCloudEventSchemaV1
>;

export function createActionItemCreatedCloudEvent(
  input: ActionItemCreatedEventPublishInput,
  options: CreateActionItemCreatedCloudEventOptions = {},
): ActionItemCreatedCloudEventV1 {
  const idFactory = options.idFactory ?? randomUUID;
  const now = options.now ?? (() => new Date());

  return actionItemCreatedCloudEventSchemaV1.parse({
    specversion: "1.0",
    id: idFactory(),
    source: actionItemCreatedEventSource,
    type: actionItemCreatedEventType,
    time: now().toISOString(),
    datacontenttype: "application/json",
    dataschema: actionItemCreatedEventDataSchema,
    data: {
      case_id: input.caseId,
      tenant_id: input.tenantId,
      description: input.description,
      deadline: input.deadline,
      completed: input.completed ?? false,
      actor: input.actor,
    },
  });
}
