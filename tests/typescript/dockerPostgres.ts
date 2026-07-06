// Temporary Docker-backed placeholder until the repo is wired to a full Testcontainers setup.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import { Client } from "pg";

interface SpawnResult {
  stdout: string;
  stderr: string;
}

export interface DockerPostgresContainer {
  connectionUri: string;
  stop(): Promise<void>;
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
  const containerName = `taxpulse-read-${randomUUID().replace(/-/g, "")}`;
  const runResult = await runCommand("docker", [
    "run",
    "--detach",
    "--rm",
    "--name",
    containerName,
    "-e",
    "POSTGRES_DB=taxpulse",
    "-e",
    "POSTGRES_USER=postgres",
    "-e",
    "POSTGRES_PASSWORD=postgres",
    "-p",
    "127.0.0.1::5432",
    "postgres:18-alpine",
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

  const connectionUri = `postgres://postgres:postgres@127.0.0.1:${hostPort}/taxpulse`;

  await waitForConnection(connectionUri);

  return {
    connectionUri,
    async stop() {
      await runCommand("docker", ["rm", "-f", containerId]);
    },
  };
}
