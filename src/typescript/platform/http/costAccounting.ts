import type { NextFunction, Request, RequestHandler, Response } from "express";

export const TAXPULSE_COST_UNITS_HEADER = "X-TaxPulse-Cost-Units";

export interface CostAccountingRequest {
  method: string;
  path: string;
}

export type CostUnitResolver = (request: CostAccountingRequest) => number | undefined;

export interface CreateCostAccountingMiddlewareOptions {
  headerName?: string;
  resolveCostUnits?: CostUnitResolver;
}

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path;
}

function getRequestPath(req: Request): string {
  return normalizePath(`${req.baseUrl}${req.path}`);
}

export function defaultCostUnitResolver({
  method,
  path,
}: CostAccountingRequest): number | undefined {
  if (method === "POST" && path === "/v1/tax-plan-cycles") {
    return 2;
  }

  if (method === "GET" && /^\/v1\/tax-plan-cycles\/[^/]+$/.test(path)) {
    return 1;
  }

  return undefined;
}

export function createCostAccountingMiddleware(
  options: CreateCostAccountingMiddlewareOptions = {},
): RequestHandler {
  const headerName = options.headerName ?? TAXPULSE_COST_UNITS_HEADER;
  const resolveCostUnits = options.resolveCostUnits ?? defaultCostUnitResolver;

  return (req: Request, res: Response, next: NextFunction) => {
    const costUnits = resolveCostUnits({
      method: req.method,
      path: getRequestPath(req),
    });

    if (costUnits !== undefined) {
      res.setHeader(headerName, String(costUnits));
    }

    next();
  };
}
