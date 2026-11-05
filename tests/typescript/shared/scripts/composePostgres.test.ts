import { beforeEach, describe, expect, it, vi } from "vitest";

const spawnSync = vi.fn();

vi.mock("node:child_process", () => ({
  spawnSync,
}));

describe("assertComposePostgresReady", () => {
  beforeEach(() => {
    vi.resetModules();
    spawnSync.mockReset();
    process.env.TAXPULSE_COMPOSE_POSTGRES_DB = "taxpulse";
    process.env.TAXPULSE_COMPOSE_POSTGRES_USER = "postgres";
    process.env.TAXPULSE_COMPOSE_POSTGRES_PASSWORD = "compose-password";
  });

  it("requires the container to be running, healthy, and published on the configured port", async () => {
    spawnSync.mockImplementation((command: string, args: string[]) => {
      if (command === "docker" && args[0] === "compose") {
        return { status: 0, stdout: "Docker Compose version v2.27.0\n", stderr: "" };
      }
      if (command === "docker" && args[0] === "inspect") {
        return {
          status: 0,
          stdout: JSON.stringify({ Running: true, Health: { Status: "healthy" } }) + "|" + JSON.stringify({ "5432/tcp": [{ HostPort: "25432" }] }) + "\n",
          stderr: "",
        };
      }
      return { status: 1, stdout: "", stderr: "unexpected command" };
    });

    const { assertComposePostgresReady } = await import(
      "../../../../src/typescript/shared/scripts/composePostgres.js"
    );
    expect(assertComposePostgresReady()).toEqual({
      connectionString: "postgresql://postgres:compose-password@127.0.0.1:25432/taxpulse",
      databaseName: "taxpulse",
      endpoint: "127.0.0.1:25432",
    });
  });

  it("rejects a stopped container", async () => {
    spawnSync.mockImplementation((command: string, args: string[]) => {
      if (command === "docker" && args[0] === "compose") {
        return { status: 0, stdout: "Docker Compose version v2.27.0\n", stderr: "" };
      }
      if (command === "docker" && args[0] === "inspect") {
        return {
          status: 0,
          stdout: JSON.stringify({ Running: false, Health: { Status: "healthy" } }) + "|" + JSON.stringify({ "5432/tcp": [{ HostPort: "25432" }] }),
          stderr: "",
        };
      }
      return { status: 1, stdout: "", stderr: "unexpected command" };
    });

    const { assertComposePostgresReady } = await import(
      "../../../../src/typescript/shared/scripts/composePostgres.js"
    );
    expect(() => assertComposePostgresReady()).toThrow("is not running");
  });

  it("rejects an unhealthy container", async () => {
    spawnSync.mockImplementation((command: string, args: string[]) => {
      if (command === "docker" && args[0] === "compose") {
        return { status: 0, stdout: "Docker Compose version v2.27.0\n", stderr: "" };
      }
      if (command === "docker" && args[0] === "inspect") {
        return {
          status: 0,
          stdout: JSON.stringify({ Running: true, Health: { Status: "starting" } }) + "|" + JSON.stringify({ "5432/tcp": [{ HostPort: "25432" }] }),
          stderr: "",
        };
      }
      return { status: 1, stdout: "", stderr: "unexpected command" };
    });

    const { assertComposePostgresReady } = await import(
      "../../../../src/typescript/shared/scripts/composePostgres.js"
    );
    expect(() => assertComposePostgresReady()).toThrow("is not healthy");
  });

  it("rejects a container published on the wrong port", async () => {
    spawnSync.mockImplementation((command: string, args: string[]) => {
      if (command === "docker" && args[0] === "compose") {
        return { status: 0, stdout: "Docker Compose version v2.27.0\n", stderr: "" };
      }
      if (command === "docker" && args[0] === "inspect") {
        return {
          status: 0,
          stdout: JSON.stringify({ Running: true, Health: { Status: "healthy" } }) + "|" + JSON.stringify({ "5432/tcp": [{ HostPort: "5433" }] }),
          stderr: "",
        };
      }
      return { status: 1, stdout: "", stderr: "unexpected command" };
    });

    const { assertComposePostgresReady } = await import(
      "../../../../src/typescript/shared/scripts/composePostgres.js"
    );
    expect(() => assertComposePostgresReady()).toThrow("not published on 25432");
  });
});
