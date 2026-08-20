import { randomUUID } from "node:crypto";

import {
  PublishCommand,
  SNSClient,
  type SNSClientConfig,
} from "@aws-sdk/client-sns";

import {
  stageChangedCloudEventSchemaV1,
  stageChangedEventDataSchema,
  stageChangedEventSource,
  stageChangedEventType,
  type CreateStageChangedCloudEventOptions,
  type StageChangedCloudEventV1,
} from "../../../stageChangedEvent.js";
import type { CloudEventPublishInput } from "./model.js";

export { PublishCommand } from "@aws-sdk/client-sns";
export type StageChangedEventPublishInput = CloudEventPublishInput;

export interface SnsClient {
  send(command: PublishCommand): Promise<unknown>;
}

export interface StageChangedEventPublisher {
  publishStageChanged(
    input: CloudEventPublishInput,
  ): Promise<void> | void;
}

export interface SnsPublisherOptions {
  idFactory?: () => string;
  now?: () => Date;
}

function buildCloudEvent(
  input: CloudEventPublishInput,
  options: SnsPublisherOptions = {},
): StageChangedCloudEventV1 {
  const idFactory = options.idFactory ?? randomUUID;
  const now = options.now ?? (() => new Date());

  return stageChangedCloudEventSchemaV1.parse({
    specversion: "1.0",
    id: `stage-transition-${idFactory()}`,
    source: stageChangedEventSource,
    type: stageChangedEventType,
    time: now().toISOString(),
    datacontenttype: "application/json",
    dataschema: stageChangedEventDataSchema,
    data: {
      case_id: input.caseId,
      tenant_id: input.tenantId,
      from_stage: input.fromStage,
      to_stage: input.toStage,
      actor: input.actor,
    },
  });
}

export function createSnsClient(
  env: NodeJS.ProcessEnv = process.env,
): SNSClient {
  //CL, AWS SNS adapter: the client stays infrastructure-only so the stage-changed CloudEvent factory remains reusable in tests and local tooling.
  const regionName = env.AWS_REGION?.trim() || "us-east-1";
  const endpointUrl = env.TAXPULSE_SNS_ENDPOINT_URL?.trim();
  const clientConfig: SNSClientConfig = {
    region: regionName,
  };

  if (endpointUrl) {
    clientConfig.endpoint = endpointUrl;
    clientConfig.credentials = {
      accessKeyId: env.AWS_ACCESS_KEY_ID?.trim() || "test",
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY?.trim() || "test",
    };
  }

  return new SNSClient(clientConfig);
}

export function getTopicArnFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const topicArn = env.TAXPULSE_STAGE_CHANGED_TOPIC_ARN?.trim();

  if (!topicArn) {
    throw new Error("TAXPULSE_STAGE_CHANGED_TOPIC_ARN is required to publish stage-changed events.");
  }

  return topicArn;
}

export function createSnsPublisher(
  snsClient: SnsClient,
  topicArn: string,
  options: SnsPublisherOptions = {},
): StageChangedEventPublisher {
  return {
    async publishStageChanged(input) {
      //CL, This adapter publishes the already-validated CloudEvent to SNS; it does not decide whether a transition is legal.
      const event = buildCloudEvent(input, options);

      await snsClient.send(
        new PublishCommand({
          TopicArn: topicArn,
          Message: JSON.stringify(event),
        }),
      );
    },
  };
}

export function createCloudEvent(
  input: CloudEventPublishInput,
  options: SnsPublisherOptions = {},
): StageChangedCloudEventV1 {
  return buildCloudEvent(input, options);
}

export function createCloudEventV1(
  input: CloudEventPublishInput,
  options: CreateStageChangedCloudEventOptions = {},
): StageChangedCloudEventV1 {
  return buildCloudEvent(input, options);
}
