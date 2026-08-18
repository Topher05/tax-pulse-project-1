import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { DeleteMessageCommand, ReceiveMessageCommand } from "@aws-sdk/client-sqs";

import {
  createStageChangedSnsClient,
  createStageChangedSqsClient,
  getStageChangedQueueUrlFromEnv,
  getStageChangedTopicArnFromEnv,
  parseStageChangedSqsMessage,
  PublishCommand,
} from "../../features/taxPlanCycle/infrastructure/cloudEvents/stageChanged/index.js";
import {
  createStageChangedCloudEventV1,
  stageChangedCloudEventSchemaV1,
  type StageChangedCloudEventV1,
} from "../../features/taxPlanCycle/stageChangedEvent.js";

loadEnv({ quiet: true });

const smokeTenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f56";
const smokeCaseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f57";
const smokeActor = "scrum-156-aws-smoke";

interface SmokeResult {
  eventId: string;
  snsMessageId: string;
  receivedMessages: number;
  matched: boolean;
}

function requireAwsRuntimeConfiguration(): void {
  if (process.env.TAXPULSE_SNS_ENDPOINT_URL?.trim()) {
    throw new Error("Unset TAXPULSE_SNS_ENDPOINT_URL before running the real AWS smoke.");
  }

  if (process.env.TAXPULSE_SQS_ENDPOINT_URL?.trim()) {
    throw new Error("Unset TAXPULSE_SQS_ENDPOINT_URL before running the real AWS smoke.");
  }

  const awsProfile = process.env.AWS_PROFILE?.trim();
  const hasLocalstackPlaceholderCredentials =
    process.env.AWS_ACCESS_KEY_ID?.trim() === "test" &&
    process.env.AWS_SECRET_ACCESS_KEY?.trim() === "test";

  if (awsProfile || hasLocalstackPlaceholderCredentials) {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_SESSION_TOKEN;
  }
}

function buildSmokeEvent(): StageChangedCloudEventV1 {
  return stageChangedCloudEventSchemaV1.parse(
    createStageChangedCloudEventV1(
      {
        tenantId: smokeTenantId,
        caseId: smokeCaseId,
        fromStage: "Intake",
        toStage: "Data Aggregation",
        actor: smokeActor,
      },
      {
        now: () => new Date(),
      },
    ),
  );
}

async function waitForPublishedEvent(input: {
  queueUrl: string;
  eventId: string;
  maxAttempts?: number;
}): Promise<{ matched: boolean; receivedMessages: number }> {
  const sqsClient = createStageChangedSqsClient(process.env);
  const maxAttempts = input.maxAttempts ?? 6;
  let receivedMessages = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: input.queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 10,
      }),
    );

    for (const message of response.Messages ?? []) {
      receivedMessages += 1;

      const event = parseStageChangedSqsMessage(message);
      if (event.id !== input.eventId) {
        continue;
      }

      if (message.ReceiptHandle) {
        await sqsClient.send(
          new DeleteMessageCommand({
            QueueUrl: input.queueUrl,
            ReceiptHandle: message.ReceiptHandle,
          }),
        );
      }

      return {
        matched: true,
        receivedMessages,
      };
    }
  }

  return {
    matched: false,
    receivedMessages,
  };
}

export async function runAwsStageChangedSmoke(): Promise<SmokeResult> {
  requireAwsRuntimeConfiguration();

  const topicArn = getStageChangedTopicArnFromEnv(process.env);
  const queueUrl = getStageChangedQueueUrlFromEnv(process.env);
  const snsClient = createStageChangedSnsClient(process.env);
  const event = buildSmokeEvent();

  const publishResult = await snsClient.send(
    new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(event),
    }),
  );
  const snsMessageId = publishResult.MessageId;

  if (!snsMessageId) {
    throw new Error("SNS publish did not return a MessageId.");
  }

  const consumeResult = await waitForPublishedEvent({
    queueUrl,
    eventId: event.id,
  });

  if (!consumeResult.matched) {
    throw new Error(
      `Published stage-changed event ${event.id} was not received from SQS.`,
    );
  }

  return {
    eventId: event.id,
    snsMessageId,
    receivedMessages: consumeResult.receivedMessages,
    matched: consumeResult.matched,
  };
}

export async function main(): Promise<void> {
  const result = await runAwsStageChangedSmoke();

  console.log("AWS stage-changed smoke passed.");
  console.log(`Event id: ${result.eventId}`);
  console.log(`SNS message id: ${result.snsMessageId}`);
  console.log(`SQS messages inspected: ${result.receivedMessages}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
