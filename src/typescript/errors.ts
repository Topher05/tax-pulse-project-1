import type { ErrorRequestHandler } from "express";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
}

export interface ProblemHttpErrorOptions {
  status: number;
  title: string;
  detail: string;
  type?: string;
}

export class ProblemHttpError extends Error {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;

  constructor({
    status,
    title,
    detail,
    type = "about:blank",
  }: ProblemHttpErrorOptions) {
    super(detail);
    this.name = "ProblemHttpError";
    this.type = type;
    this.title = title;
    this.status = status;
    this.detail = detail;
  }
}

function toProblemDetails(error: unknown): ProblemDetails {
  if (error instanceof ProblemHttpError) {
    return {
      type: error.type,
      title: error.title,
      status: error.status,
      detail: error.detail,
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

  req.log?.error(
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
