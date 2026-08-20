import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { PassThrough } from "node:stream";

import type { Express } from "express";
import { describe, expect, test, vi } from "vitest";

import { createApp } from "../../../src/typescript/app.js";
import { createLogger } from "../../../src/typescript/shared/cloud-logger/logger.js";
import {
  cloudWatchObservabilityProvider,
  emitObservabilityEvent,
  type StructuredLogger,
} from "../../../src/typescript/shared/cloud-logger/observability.js";

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

async function captureResponse(app: Express, path: string, init?: RequestInit): Promise<Response> {
  const server = await startServer(app);

  try {
    return await fetch(`${server.baseUrl}${path}`, init);
  } finally {
    await server.close();
  }
}

describe("shared cloud logger", () => {
  test("extracts request and trace context from HTTP headers", () => {
    const context = cloudWatchObservabilityProvider({
      "X-Request-Id": "request-123",
      "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      "x-amzn-trace-id": "Root=1-67891233-abcdef012345678912345678;Parent=53995c3f42cd8ad8;Sampled=1",
    });

    expect(context).toEqual({
      request_id: "request-123",
      trace_id: "4bf92f3577b34da6a3ce929d0e0e4736",
      trace_parent: "00f067aa0ba902b7",
    });
  });

  test("falls back to AWS trace headers when traceparent is not present", () => {
    const context = cloudWatchObservabilityProvider({
      "x-amzn-trace-id": "Root=1-67891233-abcdef012345678912345678;Parent=53995c3f42cd8ad8;Sampled=1",
    });

    expect(context).toEqual({
      trace_id: "1-67891233-abcdef012345678912345678",
      trace_parent: "53995c3f42cd8ad8",
      x_amzn_trace_id: "Root=1-67891233-abcdef012345678912345678;Parent=53995c3f42cd8ad8;Sampled=1",
    });
  });

  test("emits observability events through the requested logger level", () => {
    const calls: Array<{ level: "info" | "warn" | "error"; entry: Record<string, unknown> }> = [];
    const logger: StructuredLogger = {
      info(...args: unknown[]): void {
        calls.push({ level: "info", entry: args[0] as Record<string, unknown> });
      },
      warn(...args: unknown[]): void {
        calls.push({ level: "warn", entry: args[0] as Record<string, unknown> });
      },
      error(...args: unknown[]): void {
        calls.push({ level: "error", entry: args[0] as Record<string, unknown> });
      },
    };

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T12:34:56.000Z"));

    try {
      emitObservabilityEvent(logger, "warn", "request rejected", {
        service: "core-case-service",
        layer: "http",
        operation: "authorize",
        tenant_id: "tenant-1",
      });
    } finally {
      vi.useRealTimers();
    }

    expect(calls).toEqual([
      {
        level: "warn",
        entry: {
          telemetry: "observability",
          message: "request rejected",
          emitted_at: "2026-08-17T12:34:56.000Z",
          service: "core-case-service",
          layer: "http",
          operation: "authorize",
          tenant_id: "tenant-1",
        },
      },
    ]);
  });

  test("creates a logger using the configured level", () => {
    const logger = createLogger({ level: "silent" });

    expect(logger.level).toBe("silent");
  });

  test("adds observability context to HTTP request logs", async () => {
    const destination = new PassThrough();
    let buffer = "";

    destination.on("data", (chunk: Buffer | string) => {
      buffer += chunk.toString();
    });

    const app = createApp({
      logger: createLogger({ destination }),
      registerRoutes(expressApp) {
        expressApp.get("/logger-check", (_req, res) => {
          res.status(200).json({ status: "ok" });
        });
      },
    });

    const response = await captureResponse(app, "/logger-check", {
      headers: {
        "x-request-id": "req-abc",
        traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      },
    });

    expect(response.status).toBe(200);

    await new Promise((resolve) => {
      setTimeout(resolve, 25);
    });

    const logEntries = buffer
      .trim()
      .split(/\r?\n/)
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const requestCompletedLog = logEntries.find((entry) => entry.msg === "request completed");

    expect(requestCompletedLog).toBeDefined();
    expect(requestCompletedLog).toMatchObject({
      service: "core-case-service",
      layer: "http",
      method: "GET",
      route: "/logger-check",
      request_id: "req-abc",
      trace_id: "4bf92f3577b34da6a3ce929d0e0e4736",
      trace_parent: "00f067aa0ba902b7",
    });
  });
});
