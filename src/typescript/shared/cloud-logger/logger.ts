import pino, { type DestinationStream, type Logger } from "pino";
import { pinoHttp } from "pino-http";
import type { RequestHandler } from "express";

import { cloudWatchObservabilityProvider } from "./observability.js";

export interface CreateLoggerOptions {
  destination?: DestinationStream;
  level?: string;
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  return pino(
    {
      level: options.level ?? process.env.LOG_LEVEL ?? "info",
      name: "core-case-service",
    },
    options.destination,
  );
}

export function createRequestLogger(logger: Logger): RequestHandler {
  return pinoHttp({
    logger,
    customReceivedMessage: () => "request received",
    customSuccessMessage: () => "request completed",
    customErrorMessage: () => "request errored",
    customProps: (req) => {
      const requestUrl = (req as { originalUrl?: string; url?: string }).originalUrl ?? req.url;
      const observabilityContext = cloudWatchObservabilityProvider(req.headers);

      return {
        service: "core-case-service",
        layer: "http",
        method: req.method,
        route: requestUrl,
        ...observabilityContext,
      };
    },
  });
}
