import pino, { type DestinationStream, type Logger } from "pino";
import { pinoHttp } from "pino-http";
import type { RequestHandler } from "express";

import {
  cloudWatchObservabilityProvider,
  resolveRequestId,
} from "./observability.js";

export interface CreateLoggerOptions {
  destination?: DestinationStream;
  level?: string;
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  return pino(
    {
      level: options.level ?? process.env.LOG_LEVEL ?? "info",
      name: "core-case-service",
      redact: {
        censor: "[REDACTED]",
        paths: [
          "authorization",
          "authorizationHeader",
          "cookie",
          "cookies",
          "password",
          "secret",
          "secrets",
          "token",
          "access_token",
          "refresh_token",
          "id_token",
          "jwt",
          "set-cookie",
          "req.headers.authorization",
          "req.headers.cookie",
          "req.headers.cookies",
          "req.headers['set-cookie']",
          "req.headers['x-api-key']",
          "req.headers['x-amz-security-token']",
          "req.headers['x-amz-credential']",
          "req.headers['x-amz-signature']",
          "req.headers['x-amz-signedheaders']",
          "req.headers['x-amzn-security-token']",
          "req.body.authorization",
          "req.body.authorizationHeader",
          "req.body.password",
          "req.body.secret",
          "req.body.secrets",
          "req.body.token",
          "req.body.access_token",
          "req.body.refresh_token",
          "req.body.id_token",
          "req.body.jwt",
          "req.body.cookies",
          "req.body.cookie",
        ],
      },
    },
    options.destination,
  );
}

export function createRequestLogger(logger: Logger): RequestHandler {
  return pinoHttp({
    logger,
    genReqId: (req, res) => {
      const requestId =
        (req as { id?: string }).id ??
        resolveRequestId(req.headers, undefined);
      res.setHeader("x-request-id", requestId);
      return requestId;
    },
    customReceivedMessage: () => "request received",
    customSuccessMessage: () => "request completed",
    customErrorMessage: () => "request errored",
    customProps: (req) => {
      const requestUrl = (req as { originalUrl?: string; url?: string }).originalUrl ?? req.url;
      const requestId = (req as { id?: string }).id;
      const observabilityContext = cloudWatchObservabilityProvider(req.headers, requestId);

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
