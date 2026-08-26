import { spawnSync } from "node:child_process";

export const composeProjectName = "taxpulse-local";
export const composePostgresContainerName = `${composeProjectName}-postgres-1`;
export const composePostgresHost = "127.0.0.1";
export const composePostgresPort = 25432;

export interface ComposePostgresConnection {
  connectionString: string;
  databaseName: string;
  endpoint: string;
}

export function createComposePostgresConnection(): ComposePostgresConnection {
  const databaseName = requiredComposeSetting("TAXPULSE_COMPOSE_POSTGRES_DB");
  const databaseUrl = new URL(
    `postgresql://${composePostgresHost}:${composePostgresPort}`,
  );
  databaseUrl.username = requiredComposeSetting("TAXPULSE_COMPOSE_POSTGRES_USER");
  databaseUrl.password = requiredComposeSetting("TAXPULSE_COMPOSE_POSTGRES_PASSWORD");
  databaseUrl.pathname = `/${databaseName}`;

  return {
    connectionString: databaseUrl.toString(),
    databaseName,
    endpoint: `${composePostgresHost}:${composePostgresPort}`,
  };
}

export function assertComposePostgresReady(): ComposePostgresConnection {
  ensureDockerComposeAvailable();

  const connection = createComposePostgresConnection();
  const inspectResult = spawnSync(
    "docker",
    ["inspect", composePostgresContainerName, "--format", "{{json .NetworkSettings.Ports}}"],
    {
      encoding: "utf8",
    },
  );

  if (inspectResult.status !== 0) {
    throw new Error(
      `Docker Compose Postgres container ${composePostgresContainerName} is not available. Start the stack with npm run stack:up first.`,
    );
  }

  const stdout = inspectResult.stdout.trim();
  if (!stdout) {
    throw new Error(
      `Docker Compose Postgres container ${composePostgresContainerName} is missing port metadata. Start the stack with npm run stack:up first.`,
    );
  }

  let parsedPorts: Record<string, Array<{ HostIp?: string; HostPort?: string }> | null>;
  try {
    parsedPorts = JSON.parse(stdout) as Record<
      string,
      Array<{ HostIp?: string; HostPort?: string }> | null
    >;
  } catch {
    throw new Error(
      `Docker Compose Postgres container ${composePostgresContainerName} returned unreadable port metadata. Start the stack with npm run stack:up first.`,
    );
  }

  const publishedPort = parsedPorts["5432/tcp"]?.[0]?.HostPort;
  if (publishedPort !== String(composePostgresPort)) {
    throw new Error(
      `Docker Compose Postgres is not published on ${composePostgresPort}. Expected ${composePostgresContainerName} to expose 5432/tcp on host port ${composePostgresPort}, but found ${publishedPort ?? "none"}.`,
    );
  }

  return connection;
}

function requiredComposeSetting(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required to connect to the Compose PostgreSQL container.`);
  }
  return value;
}

function ensureDockerComposeAvailable(): void {
  const result = spawnSync("docker", ["compose", "version"], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error("Docker Compose is not available. Start Docker Desktop and run npm run stack:up first.");
  }
}
