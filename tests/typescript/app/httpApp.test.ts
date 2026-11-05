import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { PassThrough } from "node:stream";
import { describe, expect, test } from "vitest";
import type { Express } from "express";

import {
  ProblemHttpError,
  createApp,
  createLogger,
} from "../../../src/typescript/index.js";

const silentLogger = createLogger({ level: "silent" });

async function startServer(app: Express): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
}> {
  const server = createServer(app);

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();

  if (address === null || typeof address === "string") {
    throw new Error("Expected an ephemeral TCP address.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await closeServer(server);
    },
  };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function captureResponse(
  app: Express,
  path: string,
): Promise<Response> {
  const server = await startServer(app);

  try {
    return await fetch(`${server.baseUrl}${path}`);
  } finally {
    await server.close();
  }
}

async function captureRequest(
  app: Express,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const server = await startServer(app);

  try {
    return await fetch(`${server.baseUrl}${path}`, init);
  } finally {
    await server.close();
  }
}

describe("createApp", () => {
  test("returns the health payload on GET /health", async () => {
    const response = await captureResponse(
      createApp({ logger: silentLogger }),
      "/health",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(
      "application/json",
    );
    expect(response.headers.get("x-request-id")).toMatch(/\S+/);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("returns RFC 7807 JSON for typed application errors", async () => {
    const response = await captureResponse(
      createApp({
        logger: silentLogger,
        registerRoutes: (app) => {
          app.get("/typed-error", () => {
            throw new ProblemHttpError({
              type: "https://example.com/problems/cycle-conflict",
              title: "Cycle Conflict",
              status: 409,
              detail: "The requested tax plan cycle is already locked.",
            });
          });
        },
      }),
      "/typed-error",
    );

    expect(response.status).toBe(409);
    expect(response.headers.get("content-type")).toContain(
      "application/problem+json",
    );
    expect(await response.json()).toEqual({
      type: "https://example.com/problems/cycle-conflict",
      title: "Cycle Conflict",
      status: 409,
      detail: "The requested tax plan cycle is already locked.",
    });
  });

  test("returns a generic 500 problem document for unexpected errors", async () => {
    const response = await captureResponse(
      createApp({
        logger: silentLogger,
        registerRoutes: (app) => {
          app.get("/unexpected-error", () => {
            throw new Error("database exploded");
          });
        },
      }),
      "/unexpected-error",
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain(
      "application/problem+json",
    );
    expect(await response.json()).toEqual({
      type: "about:blank",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred.",
    });
  });

  test("emits structured request logs for health requests", async () => {
    const destination = new PassThrough();
    let buffer = "";

    destination.on("data", (chunk: Buffer | string) => {
      buffer += chunk.toString();
    });

    const response = await captureResponse(
      createApp({
        logger: createLogger({ destination }),
      }),
      "/health",
    );

    expect(response.status).toBe(200);

    await new Promise((resolve) => {
      setTimeout(resolve, 25);
    });

    const logEntries = buffer
      .trim()
      .split(/\r?\n/)
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const requestCompletedLog = logEntries.find(
      (entry) => entry.msg === "request completed",
    );

    expect(requestCompletedLog).toBeDefined();
    expect(requestCompletedLog?.req).toMatchObject({
      method: "GET",
      url: "/health",
    });
    expect(requestCompletedLog?.res).toMatchObject({
      statusCode: 200,
    });
    expect(requestCompletedLog?.responseTime).toEqual(expect.any(Number));
  });

  test("answers CORS preflight requests for browser API calls", async () => {
    const response = await captureRequest(createApp({ logger: silentLogger }), "/health", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Authorization, Content-Type, Idempotency-Key",
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    );
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "Authorization, Content-Type, Idempotency-Key",
    );
    expect(response.headers.get("access-control-max-age")).toBe("600");
  });
});
