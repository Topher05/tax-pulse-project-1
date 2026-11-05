import type { ErrorRequestHandler } from "express";
import type { Logger } from "pino";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  [extension: string]: unknown;
}

export interface ProblemHttpErrorOptions {
  status: number;
  title: string;
  detail: string;
  type?: string;
  extensions?: Record<string, unknown>;
}

export class ProblemHttpError extends Error {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly extensions: Record<string, unknown>;

  constructor({
    status,
    title,
    detail,
    type = "about:blank",
    extensions = {},
  }: ProblemHttpErrorOptions) {
    super(detail);
    this.name = "ProblemHttpError";
    this.type = type;
    this.title = title;
    this.status = status;
    this.detail = detail;
    this.extensions = extensions;
  }
}

function toProblemDetails(error: unknown): ProblemDetails {
  if (error instanceof ProblemHttpError) {
    return {
      type: error.type,
      title: error.title,
      status: error.status,
      detail: error.detail,
      ...error.extensions,
    };
  }

  return {
    type: "about:blank",
    title: "Internal Server Error",
    status: 500,
    detail: "An unexpected error occurred.",
  };
}

export const problemDetailsMiddleware: ErrorRequestHandler = (
  error,
  req,
  res,
  _next,
) => {
  const problem = toProblemDetails(error);
  const requestLogger = (req as typeof req & { log?: Pick<Logger, "error"> }).log;

  requestLogger?.error(
    {
      err: error,
      problem,
    },
    "request failed",
  );

  res
    .status(problem.status)
    .type("application/problem+json")
    .json(problem);
};
