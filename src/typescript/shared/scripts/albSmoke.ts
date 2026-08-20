import { fileURLToPath } from "node:url";

const defaultAlbBaseUrl = "http://taxpulse-api-alb-350585859.us-east-1.elb.amazonaws.com";
const defaultRetryDelayMs = 1_000;
const defaultRetryAttempts = 5;

export interface AlbSmokeResult {
  coreCaseStatus: number;
  taxEngineStatus: number;
  taxEngineTotalLiability: unknown;
}

export interface AlbSmokeOptions {
  albBaseUrl?: string;
  bearerToken?: string;
  fetchImpl?: typeof fetch;
  retryAttempts?: number;
  retryDelayMs?: number;
}

async function parseResponseBody(response: Response): Promise<unknown> {
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

async function retry<T>(
  label: string,
  operation: () => Promise<T>,
  attempts: number,
  delayMs: number,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < attempts) {
        await new Promise((resolve) => {
          setTimeout(resolve, delayMs);
        });
      }
    }
  }

  throw new Error(
    `${label} failed after ${attempts} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

function assertOkResponse(serviceName: string, status: number, body: unknown): void {
  if (status >= 200 && status < 300) {
    return;
  }

  throw new Error(`${serviceName} returned HTTP ${status}: ${JSON.stringify(body)}`);
}

async function smokeCoreCase(
  albBaseUrl: string,
  bearerToken: string,
  fetchImpl: typeof fetch,
): Promise<number> {
  const response = await fetchImpl(`${albBaseUrl}/v1/tax-plan-cycles`, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  });
  const body = await parseResponseBody(response);

  assertOkResponse("Core Case Service", response.status, body);

  return response.status;
}

async function smokeTaxEngine(
  albBaseUrl: string,
  bearerToken: string,
  fetchImpl: typeof fetch,
): Promise<{ status: number; totalLiability: unknown }> {
  const response = await fetchImpl(`${albBaseUrl}/tax-calculations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
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
  const body = await parseResponseBody(response);

  assertOkResponse("Tax Engine", response.status, body);

  const totalLiability =
    body && typeof body === "object" && "total_liability" in body
      ? body.total_liability
      : undefined;

  return {
    status: response.status,
    totalLiability,
  };
}

export async function runAlbSmoke(options: AlbSmokeOptions = {}): Promise<AlbSmokeResult> {
  const albBaseUrl = (options.albBaseUrl ?? defaultAlbBaseUrl).replace(/\/$/, "");
  const bearerToken = options.bearerToken?.trim();
  const fetchImpl = options.fetchImpl ?? fetch;
  const retryAttempts = options.retryAttempts ?? defaultRetryAttempts;
  const retryDelayMs = options.retryDelayMs ?? defaultRetryDelayMs;

  if (!bearerToken) {
    throw new Error("TAXPULSE_SMOKE_BEARER_TOKEN is required for protected ALB routes.");
  }

  const coreCaseStatus = await retry(
    "Core Case Service ALB route",
    () => smokeCoreCase(albBaseUrl, bearerToken, fetchImpl),
    retryAttempts,
    retryDelayMs,
  );
  const taxEngine = await retry(
    "Tax Engine ALB route",
    () => smokeTaxEngine(albBaseUrl, bearerToken, fetchImpl),
    retryAttempts,
    retryDelayMs,
  );

  return {
    coreCaseStatus,
    taxEngineStatus: taxEngine.status,
    taxEngineTotalLiability: taxEngine.totalLiability,
  };
}

export async function main(): Promise<void> {
  const logger = console;

  try {
    const result = await runAlbSmoke({
      albBaseUrl: process.env.TAXPULSE_ALB_BASE_URL?.trim() || undefined,
      bearerToken: process.env.TAXPULSE_SMOKE_BEARER_TOKEN?.trim(),
    });

    logger.log("PASS TaxPulse ALB smoke check passed");
    logger.log(JSON.stringify(result, null, 2));
  } catch (error) {
    logger.error("FAIL TaxPulse ALB smoke check failed");
    logger.error(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(() => {
    process.exitCode = 1;
  });
}
