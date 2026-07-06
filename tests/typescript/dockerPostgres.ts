// Temporary Docker-backed placeholder until the repo is wired to a full Testcontainers setup.
import { config as loadEnv } from "dotenv";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import { Client } from "pg";

loadEnv();

interface SpawnResult {
  stdout: string;
  stderr: string;
}

export interface DockerPostgresContainer {
  connectionUri: string;
  stop(): Promise<void>;
}

const defaultDockerPostgresImage = "postgres:18-alpine";
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
    image: process.env.DOCKER_POSTGRES_IMAGE?.trim() || defaultDockerPostgresImage,
    database: process.env.DOCKER_POSTGRES_DB?.trim() || defaultDockerPostgresDb,
    user: process.env.DOCKER_POSTGRES_USER?.trim() || defaultDockerPostgresUser,
    password:
      process.env.DOCKER_POSTGRES_PASSWORD?.trim() || defaultDockerPostgresPassword,
  };
}

function toPostgresConnectionUri(
  user: string,
  password: string,
  hostPort: string,
  database: string,
): string {
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);

  return `postgres://${encodedUser}:${encodedPassword}@127.0.0.1:${hostPort}/${database}`;
}

function runCommand(command: string, args: string[]): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        return;
      }

      reject(
        new Error(
          `Command failed: ${command} ${args.join(" ")}\n${stderr.trim()}`,
        ),
      );
    });
  });
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

  throw lastError ?? new Error("Timed out waiting for the PostgreSQL container.");
}

export async function startDockerPostgresContainer(): Promise<DockerPostgresContainer> {
  const config = getDockerPostgresConfig();
  const containerName = `taxpulse-read-${randomUUID().replace(/-/g, "")}`;
  const runResult = await runCommand("docker", [
    "run",
    "--detach",
    "--rm",
    "--name",
    containerName,
    "-e",
    `POSTGRES_DB=${config.database}`,
    "-e",
    `POSTGRES_USER=${config.user}`,
    "-e",
    `POSTGRES_PASSWORD=${config.password}`,
    "-p",
    "127.0.0.1::5432",
    config.image,
  ]);
  const containerId = runResult.stdout;

  const portMapping = await runCommand("docker", [
    "port",
    containerId,
    "5432/tcp",
  ]);
  const hostPort = portMapping.stdout
    .split(":")
    .pop()
    ?.trim();

  if (!hostPort) {
    throw new Error("Could not determine the PostgreSQL host port.");
  }

  const connectionUri = toPostgresConnectionUri(
    config.user,
    config.password,
    hostPort,
    config.database,
  );

  await waitForConnection(connectionUri);

  return {
    connectionUri,
    async stop() {
      await runCommand("docker", ["rm", "-f", containerId]);
    },
  };
}
