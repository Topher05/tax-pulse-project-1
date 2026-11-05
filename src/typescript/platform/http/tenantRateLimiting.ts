import type { NextFunction, Request, RequestHandler, Response } from "express";

import { ProblemHttpError } from "./errors.js";

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_MS = 60_000;

export interface TenantRateLimitBucket {
  windowStartedAt: number;
  count: number;
}

export interface TenantRateLimitStore {
  get(tenantId: string): TenantRateLimitBucket | undefined;
  set(tenantId: string, bucket: TenantRateLimitBucket): void;
}

export interface CreateTenantRateLimitMiddlewareOptions {
  limit?: number;
  windowMs?: number;
  now?: () => number;
  store?: TenantRateLimitStore;
}

function createDefaultStore(): TenantRateLimitStore {
  return new Map<string, TenantRateLimitBucket>();
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}

function authenticationRequired(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/authentication-required",
    title: "Authentication Required",
    status: 401,
    detail: "A valid access token is required.",
  });
}

function rateLimitExceeded(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/rate-limit-exceeded",
    title: "Rate Limit Exceeded",
    status: 429,
    detail: "The tenant rate limit has been exceeded. Retry after the current window resets.",
  });
}

export function createTenantRateLimitMiddleware(
  options: CreateTenantRateLimitMiddlewareOptions = {},
): RequestHandler {
  const limit = positiveInteger(options.limit ?? DEFAULT_LIMIT, "limit");
  const windowMs = positiveInteger(options.windowMs ?? DEFAULT_WINDOW_MS, "windowMs");
  const now = options.now ?? Date.now;
  const store = options.store ?? createDefaultStore();

  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.tenant?.id;

    if (!tenantId) {
      next(authenticationRequired());
      return;
    }

    const currentTime = now();
    const existingBucket = store.get(tenantId);
    const bucket =
      existingBucket && currentTime - existingBucket.windowStartedAt < windowMs
        ? existingBucket
        : { windowStartedAt: currentTime, count: 0 };

    if (bucket.count >= limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((bucket.windowStartedAt + windowMs - currentTime) / 1_000),
      );

      res.setHeader("Retry-After", String(retryAfterSeconds));
      next(rateLimitExceeded());
      return;
    }

    bucket.count += 1;
    store.set(tenantId, bucket);
    next();
  };
}
