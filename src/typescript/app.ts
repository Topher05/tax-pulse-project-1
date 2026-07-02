import express, { type Express } from "express";
import type { Logger } from "pino";

import { problemDetailsMiddleware } from "./errors.js";
import { createLogger, createRequestLogger } from "./logger.js";

export interface CreateAppOptions {
  logger?: Logger;
  registerRoutes?: (app: Express) => void;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const logger = options.logger ?? createLogger();
  const app = express();

  app.disable("x-powered-by");
  app.use(createRequestLogger(logger));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  options.registerRoutes?.(app);

  app.use(problemDetailsMiddleware);

  return app;
}
