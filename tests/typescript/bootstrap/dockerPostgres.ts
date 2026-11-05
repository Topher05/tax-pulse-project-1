import { config as loadEnv } from "dotenv";
import { setTimeout as delay } from "node:timers/promises";

import { Client } from "pg";
import {
  GenericContainer,
  Wait,
  type StartedTestContainer,
} from "testcontainers";

loadEnv();

export interface DockerPostgresContainer {
  connectionUri: string;
  stop(): Promise<void>;
}

export interface DockerPostgresBootstrapOptions {
  bootstrap?: (connectionUri: string) => Promise<void>;
}

const defaultDockerPostgresImage = "pgvector/pgvector:pg18";
const defaultDockerPostgresDb = "taxpulse";
const defaultDockerPostgresUser = "postgres";
const defaultDockerPostgresPassword = "postgres";

function getDockerPostgresConfig(): {
  image: string;
  database: string;
  user: string;
  password: string;
} {
  return {
    image:
      process.env.DOCKER_POSTGRES_IMAGE?.trim() || defaultDockerPostgresImage,
    database:
      process.env.DOCKER_POSTGRES_DB?.trim() || defaultDockerPostgresDb,
    user:
      process.env.DOCKER_POSTGRES_USER?.trim() || defaultDockerPostgresUser,
    password:
      process.env.DOCKER_POSTGRES_PASSWORD?.trim() || defaultDockerPostgresPassword,
  };
}

function toPostgresConnectionUri(
  user: string,
  password: string,
  host: string,
  hostPort: number,
  database: string,
): string {
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);

  return `postgres://${encodedUser}:${encodedPassword}@${host}:${hostPort}/${database}`;
}

async function waitForConnection(connectionUri: string): Promise<void> {
  const timeoutMs = 30_000;
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    const client = new Client({ connectionString: connectionUri });

    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
      await delay(500);
    }
  }

  throw (
    lastError ?? new Error("Timed out waiting for the PostgreSQL container.")
  );
}

async function assertPgvectorAvailable(
  connectionUri: string,
  image: string,
): Promise<void> {
  const client = new Client({ connectionString: connectionUri });

  await client.connect();

  try {
    const result = await client.query<{ available: boolean }>(
      `SELECT EXISTS (
        SELECT 1
        FROM pg_available_extensions
        WHERE name = 'vector'
      ) AS available`,
    );

    if (!result.rows[0]?.available) {
      throw new Error(
        `PostgreSQL test image "${image}" does not provide pgvector. ` +
          `Set DOCKER_POSTGRES_IMAGE=${defaultDockerPostgresImage}.`,
      );
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}

function createPostgresContainer(
  image: string,
  database: string,
  user: string,
  password: string,
): GenericContainer {
  return new GenericContainer(image)
    .withEnvironment({
      POSTGRES_DB: database,
      POSTGRES_USER: user,
      POSTGRES_PASSWORD: password,
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(45_000);
}

export async function startDockerPostgresContainer(
  options: DockerPostgresBootstrapOptions = {},
): Promise<DockerPostgresContainer> {
  const config = getDockerPostgresConfig();
  const startedContainer: StartedTestContainer = await createPostgresContainer(
    config.image,
    config.database,
    config.user,
    config.password,
  ).start();
  const host = startedContainer.getHost();
  const hostPort = startedContainer.getMappedPort(5432);
  const connectionUri = toPostgresConnectionUri(
    config.user,
    config.password,
    host,
    hostPort,
    config.database,
  );

  try {
    await waitForConnection(connectionUri);
    await assertPgvectorAvailable(connectionUri, config.image);
    await options.bootstrap?.(connectionUri);
  } catch (error) {
    await startedContainer.stop().catch(() => undefined);
    throw error;
  }

  return {
    connectionUri,
    async stop() {
      await startedContainer.stop();
    },
  };
}
