import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

loadEnv({ quiet: true });

const defaultPollAttempts = 12;
const defaultPollDelayMs = 2_000;

interface SmokeConfiguration {
  albBaseUrl: string;
  transitionApiUrl: string;
  bearerToken: string;
  tenantId: string;
  caseId: string;
  projectionTableName: string;
  awsRegion: string;
}

interface FreshApplySmokeResult {
  albStatus: number;
  transitionStatus: number;
  projectedStage: string;
  pollAttempts: number;
}

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for the fresh-apply smoke.`);
  }

  return value;
}

function getConfiguration(): SmokeConfiguration {
  return {
    albBaseUrl: required("TAXPULSE_ALB_BASE_URL").replace(/\/$/, ""),
    transitionApiUrl: required("TAXPULSE_TRANSITION_API_URL").replace(/\/$/, ""),
    bearerToken: required("TAXPULSE_SMOKE_BEARER_TOKEN"),
    tenantId: required("TAXPULSE_SMOKE_TENANT_ID"),
    caseId: required("TAXPULSE_SMOKE_CASE_ID"),
    projectionTableName: required("TAXPULSE_PROJECTION_TABLE_NAME"),
    awsRegion: process.env.AWS_REGION?.trim() || "us-east-1",
  };
}

async function responseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function assertSuccess(phase: string, response: Response, body: unknown): void {
  if (response.status >= 200 && response.status < 300) {
    return;
  }

  throw new Error(`${phase} returned HTTP ${response.status}: ${JSON.stringify(body)}`);
}

async function runAlbCalculation(config: SmokeConfiguration): Promise<number> {
  const response = await fetch(`${config.albBaseUrl}/tax-calculations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.bearerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      income: "100000",
      deductions: "12000",
      withholding: 24500,
      state: "CA",
      filing_status: "single",
    }),
  });
  const body = await responseBody(response);
  assertSuccess("ALB tax calculation phase", response, body);
  return response.status;
}

async function runPresentToClient(config: SmokeConfiguration): Promise<number> {
  const response = await fetch(
    `${config.transitionApiUrl}/v1/tax-plan-cycles/${encodeURIComponent(config.caseId)}/present-to-client`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action_item: {
          description: "Synthetic fresh-apply smoke action item",
          deadline: "2030-01-01",
        },
      }),
    },
  );
  const body = await responseBody(response);
  assertSuccess("API Gateway present-to-client phase", response, body);
  return response.status;
}

async function waitForProjection(config: SmokeConfiguration): Promise<{
  stage: string;
  attempts: number;
}> {
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.awsRegion }));
  const attempts = Number(process.env.TAXPULSE_PROJECTION_POLL_ATTEMPTS ?? defaultPollAttempts);
  const delayMs = Number(process.env.TAXPULSE_PROJECTION_POLL_DELAY_MS ?? defaultPollDelayMs);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await client.send(
      new GetCommand({
        TableName: config.projectionTableName,
        Key: {
          tenant_id: config.tenantId,
          case_id: config.caseId,
        },
      }),
    );
    const stage = typeof response.Item?.stage === "string" ? response.Item.stage : undefined;

    if (stage === "Client Approval") {
      return { stage, attempts: attempt };
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(
    `DynamoDB projection phase did not reach Client Approval after ${attempts} attempts `
      + `for tenant ${config.tenantId} and case ${config.caseId}.`,
  );
}

export async function runAwsFreshApplySmoke(): Promise<FreshApplySmokeResult> {
  const config = getConfiguration();

  let albStatus: number;
  try {
    albStatus = await runAlbCalculation(config);
  } catch (error) {
    throw new Error(`Fresh-apply smoke failed during ALB calculation: ${String(error)}`);
  }

  let transitionStatus: number;
  try {
    transitionStatus = await runPresentToClient(config);
  } catch (error) {
    throw new Error(`Fresh-apply smoke failed during present-to-client: ${String(error)}`);
  }

  try {
    const projection = await waitForProjection(config);
    return {
      albStatus,
      transitionStatus,
      projectedStage: projection.stage,
      pollAttempts: projection.attempts,
    };
  } catch (error) {
    throw new Error(`Fresh-apply smoke failed during projection polling: ${String(error)}`);
  }
}

async function main(): Promise<void> {
  const result = await runAwsFreshApplySmoke();
  console.log("AWS fresh-apply smoke passed.");
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
