import { PublishCommand } from "@aws-sdk/client-sns";

import {
  createActionItemCompletedCloudEvent,
  type ActionItemCompletedEventPublishInput,
} from "./model.js";

export interface ActionItemCompletedSnsClient {
  send(command: PublishCommand): Promise<unknown>;
}

export interface ActionItemCompletedEventPublisher {
  publishActionItemCompleted(
    input: ActionItemCompletedEventPublishInput,
  ): Promise<void> | void;
}

export function createActionItemCompletedSnsPublisher(
  snsClient: ActionItemCompletedSnsClient,
  topicArn: string,
): ActionItemCompletedEventPublisher {
  return {
    async publishActionItemCompleted(input) {
      const event = createActionItemCompletedCloudEvent(input);
      await snsClient.send(
        new PublishCommand({
          TopicArn: topicArn,
          Message: JSON.stringify(event),
        }),
      );
    },
  };
}
