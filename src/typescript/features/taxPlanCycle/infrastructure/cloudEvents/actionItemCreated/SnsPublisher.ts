import { randomUUID } from "node:crypto";

import {
  PublishCommand,
  SNSClient,
  type SNSClientConfig,
} from "@aws-sdk/client-sns";

import {
  actionItemCreatedCloudEventSchemaV1,
  actionItemCreatedEventDataSchema,
  actionItemCreatedEventSource,
  actionItemCreatedEventType,
  type ActionItemCreatedCloudEventV1,
} from "./model.js";
import type { ActionItemCreatedEventPublishInput } from "./model.js";

export interface ActionItemCreatedSnsClient {
  send(command: PublishCommand): Promise<unknown>;
}

export interface CreateActionItemCreatedCloudEventOptions {
  idFactory?: () => string;
  now?: () => Date;
}

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

export function createActionItemCreatedSnsClient(
  env: NodeJS.ProcessEnv = process.env,
): SNSClient {
  // CL, AWS SNS adapter for the action-item-created event boundary.
  const regionName = env.AWS_REGION?.trim() || "us-east-1";
  const clientConfig: SNSClientConfig = {
    region: regionName,
  };

  return new SNSClient(clientConfig);
}

export function getActionItemCreatedTopicArnFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const topicArn = env.TAXPULSE_ACTION_ITEM_CREATED_TOPIC_ARN?.trim();

  if (!topicArn) {
    throw new Error(
      "TAXPULSE_ACTION_ITEM_CREATED_TOPIC_ARN is required to publish action-item-created events.",
    );
  }

  return topicArn;
}

export function createSnsActionItemCreatedEventPublisher(
  snsClient: ActionItemCreatedSnsClient,
  topicArn: string,
  options: CreateActionItemCreatedCloudEventOptions = {},
): {
  publishActionItemCreated(
    input: ActionItemCreatedEventPublishInput,
  ): Promise<void>;
} {
  return {
    async publishActionItemCreated(input) {
      //CL, Keep event serialization in the boundary layer; business logic should only provide the input payload.
      const event = createActionItemCreatedCloudEvent(input, options);
      const publishInput = {
        TopicArn: topicArn,
        Message: JSON.stringify(event),
        ...(topicArn.endsWith(".fifo")
          ? {
              MessageGroupId: input.caseId,
              MessageDeduplicationId: event.id,
            }
          : {}),
      };

      await snsClient.send(
        new PublishCommand(publishInput),
      );
    },
  };
}
