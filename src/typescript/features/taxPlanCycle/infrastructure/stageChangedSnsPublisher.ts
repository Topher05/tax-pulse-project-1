import {
  PublishCommand,
  SNSClient,
  type SNSClientConfig,
} from "@aws-sdk/client-sns";

import {
  createStageChangedCloudEventV1,
  type CreateStageChangedCloudEventOptions,
  type StageChangedEventPublishInput,
} from "../stageChangedEvent.js";

export interface StageChangedEventPublisher {
  publishStageChanged(
    input: StageChangedEventPublishInput,
  ): Promise<void> | void;
}

export interface StageChangedSnsClient {
  send(command: PublishCommand): Promise<unknown>;
}

export function createStageChangedSnsClient(
  env: NodeJS.ProcessEnv = process.env,
): SNSClient {
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

export function getStageChangedTopicArnFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const topicArn = env.TAXPULSE_STAGE_CHANGED_TOPIC_ARN?.trim();

  if (!topicArn) {
    throw new Error("TAXPULSE_STAGE_CHANGED_TOPIC_ARN is required to publish stage-changed events.");
  }

  return topicArn;
}

export function createSnsStageChangedEventPublisher(
  snsClient: StageChangedSnsClient,
  topicArn: string,
  options: CreateStageChangedCloudEventOptions = {},
): StageChangedEventPublisher {
  return {
    async publishStageChanged(input) {
      const event = createStageChangedCloudEventV1(input, options);

      await snsClient.send(
        new PublishCommand({
          TopicArn: topicArn,
          Message: JSON.stringify(event),
        }),
      );
    },
  };
}
