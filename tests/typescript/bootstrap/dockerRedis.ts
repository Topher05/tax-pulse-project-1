import { setTimeout as delay } from "node:timers/promises";

import { createClient } from "redis";
import {
  GenericContainer,
  Wait,
  type StartedTestContainer,
} from "testcontainers";

export interface DockerRedisContainer {
  connectionUri: string;
  stop(): Promise<void>;
}

async function waitForRedisConnection(connectionUri: string): Promise<void> {
  const timeoutMs = 30_000;
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    const client = createClient({ url: connectionUri });

    try {
      await client.connect();
      await client.ping();
      await client.quit();
      return;
    } catch (error) {
      lastError = error;
      await client.quit().catch(() => undefined);
      await delay(500);
    }
  }

  throw lastError ?? new Error("Timed out waiting for the Redis container.");
}

function createRedisContainer(image: string): GenericContainer {
  return new GenericContainer(image)
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(45_000);
}

export async function startDockerRedisContainer(
  image: string = "redis:7-alpine",
): Promise<DockerRedisContainer> {
  const startedContainer: StartedTestContainer = await createRedisContainer(
    image,
  ).start();
  const host = startedContainer.getHost();
  const hostPort = startedContainer.getMappedPort(6379);
  const connectionUri = `redis://${host}:${hostPort}`;

  try {
    await waitForRedisConnection(connectionUri);
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
