import { fileURLToPath } from "node:url";

import { createClient } from "redis";

const defaultCoreBaseUrl = "http://127.0.0.1:3000";
const defaultTaxEngineBaseUrl = "http://127.0.0.1:8000";
const defaultRedisUrl = "redis://localhost:6379";
const smokeTenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";
const defaultRetryDelayMs = 1_000;
const defaultRetryAttempts = 5;

export interface StackSmokeResult {
  coreHealth: string;
  taxEngineHealth: string;
  redisPing: string;
  registeredEmail: string;
}

export interface StackSmokeOptions {
  coreBaseUrl?: string;
  taxEngineBaseUrl?: string;
  redisUrl?: string;
  now?: () => Date;
  fetchImpl?: typeof fetch;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export function buildStackSmokeEmail(now: () => Date = () => new Date()): string {
  const timestamp = now().toISOString().replace(/[^0-9]/g, "");

  return `compose-smoke-${timestamp}@example.com`;
}

export function buildStackSmokeConnectionFailureMessage(
  label: string,
  attempts: number,
  reason: string,
): string {
  return `${label} failed to connect container after ${attempts} attempts: ${reason}`;
}

async function fetchJson(
  url: string,
  fetchImpl: typeof fetch,
): Promise<{ status: number; body: unknown }> {
  const response = await fetchImpl(url);

  return {
    status: response.status,
    body: await response.json(),
  };
}

async function checkHealth(
  serviceName: string,
  baseUrl: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const response = await fetchJson(`${baseUrl}/health`, fetchImpl);

  if (response.status !== 200) {
    throw new Error(`${serviceName} health returned HTTP ${response.status}.`);
  }

  return "ok";
}

async function checkRegistration(
  coreBaseUrl: string,
  email: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const response = await fetchImpl(`${coreBaseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenant_id: smokeTenantId,
      email,
      password: "synthetic-compose-smoke-password",
    }),
  });

  if (response.status !== 201) {
    const responseText = await response.text();

    throw new Error(
      `Core auth registration returned HTTP ${response.status}: ${responseText}`,
    );
  }

  return email;
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
    buildStackSmokeConnectionFailureMessage(
      label,
      attempts,
      lastError instanceof Error ? lastError.message : String(lastError),
    ),
  );
}

export async function runStackSmoke(
  options: StackSmokeOptions = {},
): Promise<StackSmokeResult> {
  const coreBaseUrl = options.coreBaseUrl ?? defaultCoreBaseUrl;
  const taxEngineBaseUrl = options.taxEngineBaseUrl ?? defaultTaxEngineBaseUrl;
  const redisUrl = options.redisUrl ?? defaultRedisUrl;
  const fetchImpl = options.fetchImpl ?? fetch;
  const redisClient = createClient({
    url: redisUrl,
    socket: { connectTimeout: 3_000 },
  });
  const retryAttempts = options.retryAttempts ?? defaultRetryAttempts;
  const retryDelayMs = options.retryDelayMs ?? defaultRetryDelayMs;

  try {
    const coreHealth = await retry(
      "Core Case Service health",
      () => checkHealth("Core Case Service", coreBaseUrl, fetchImpl),
      retryAttempts,
      retryDelayMs,
    );
    const taxEngineHealth = await retry(
      "Tax Engine health",
      () => checkHealth("Tax Engine", taxEngineBaseUrl, fetchImpl),
      retryAttempts,
      retryDelayMs,
    );
    await retry(
      "Redis ping",
      async () => {
        await redisClient.connect();
        return await redisClient.ping();
      },
      retryAttempts,
      retryDelayMs,
    );
    const redisPing = String(await redisClient.ping());
    const registeredEmail = await retry(
      "Core auth registration",
      () =>
        checkRegistration(
          coreBaseUrl,
          buildStackSmokeEmail(options.now),
          fetchImpl,
        ),
      retryAttempts,
      retryDelayMs,
    );

    return {
      coreHealth,
      taxEngineHealth,
      redisPing,
      registeredEmail,
    };
  } finally {
    await redisClient.quit().catch(() => undefined);
  }
}

export async function main(): Promise<void> {
  const logger = console;

  try {
    const result = await runStackSmoke({
      coreBaseUrl: process.env.TAXPULSE_STACK_CORE_URL?.trim() || undefined,
      taxEngineBaseUrl:
        process.env.TAXPULSE_STACK_TAX_ENGINE_URL?.trim() || undefined,
      redisUrl: process.env.TAXPULSE_STACK_REDIS_URL?.trim() || undefined,
    });

    logger.log("PASS TaxPulse Compose smoke check passed");
    logger.log(JSON.stringify(result, null, 2));
  } catch (error) {
    logger.error("FAIL TaxPulse Compose smoke check failed");
    logger.error(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(() => {
    process.exitCode = 1;
  });
}
